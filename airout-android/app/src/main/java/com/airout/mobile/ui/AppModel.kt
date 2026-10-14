package com.airout.mobile.ui

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.airout.mobile.BuildConfig
import com.airout.mobile.data.ApiClient
import com.airout.mobile.data.ApiException
import com.airout.mobile.data.SessionStore
import com.airout.mobile.listener.practiceReply
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class MoodItem(val id: String, val mood: String, val note: String)
data class ChatItem(val id: String, val role: String, val content: String, val at: String)
data class JournalItem(val id: String, val title: String, val body: String, val date: String)
data class PostItem(
    val id: String,
    val name: String,
    val category: String,
    val body: String,
    val replies: Int,
    val support: Int,
    val mine: Boolean,
)

class AppModel(app: Application) : AndroidViewModel(app) {
    private val prefs = app.getSharedPreferences("airout-android-guest", Context.MODE_PRIVATE)
    private val session = SessionStore(app)
    var apiBase by mutableStateOf(prefs.getString("api", BuildConfig.API_BASE_URL) ?: BuildConfig.API_BASE_URL)
        private set
    private val api = ApiClient(
        baseUrl = { apiBase },
        accessToken = { session.accessToken },
        refreshToken = { session.refreshToken },
        onRefreshed = { access, refresh ->
            session.accessToken = access
            session.refreshToken = refresh
        },
    )

    var tab by mutableStateOf("home")
    var sheet by mutableStateOf("none")
    var alias by mutableStateOf(prefs.getString("alias", "Kind Stranger") ?: "Kind Stranger")
    var theme by mutableStateOf(prefs.getString("theme", "system") ?: "system")
    var mode by mutableStateOf("listen")
    var keepChat by mutableStateOf(false)
    var guidelines by mutableStateOf(prefs.getBoolean("guidelines", false))
    var signedIn by mutableStateOf(session.signedIn)
    var email by mutableStateOf(session.email)
    var serverUp by mutableStateOf(false)
    var busy by mutableStateOf(false)
    var notice by mutableStateOf("")
    var error by mutableStateOf("")
    var secureTokens by mutableStateOf(session.encrypted)
    private var remoteConversationId: String? = null

    val moods = mutableStateListOf<MoodItem>()
    val messages = mutableStateListOf<ChatItem>()
    val journal = mutableStateListOf<JournalItem>()
    val posts = mutableStateListOf<PostItem>()

    val greetingName: String get() = session.displayName.ifBlank { alias }

    init {
        load()
        if (messages.isEmpty()) {
            messages.add(ChatItem(UUID.randomUUID().toString(), "assistant", "Hi. This is your private space to share. What’s on your mind?", "now"))
        }
        refreshHealth()
        if (signedIn) loadRemotePosts()
    }

    fun setApi(url: String) {
        apiBase = url.trim().ifBlank { BuildConfig.API_BASE_URL }
        prefs.edit().putString("api", apiBase).apply()
        refreshHealth()
    }

    fun setNickname(value: String) {
        alias = value.trim().ifBlank { "Kind Stranger" }
        prefs.edit().putString("alias", alias).apply()
    }

    fun setAppearance(value: String) {
        theme = value
        prefs.edit().putString("theme", value).apply()
    }

    fun refreshHealth() {
        viewModelScope.launch {
            serverUp = withContext(Dispatchers.IO) { api.health() }
        }
    }

    fun saveMood(mood: String, note: String) {
        if (mood.isBlank()) {
            error = "Choose the feeling that is closest. There is no wrong answer."
            return
        }
        viewModelScope.launch {
            error = ""
            try {
                if (signedIn) withContext(Dispatchers.IO) { api.saveMood(mood, note) }
                moods.add(0, MoodItem(UUID.randomUUID().toString(), mood, note.trim()))
                persist()
                notice = "Saved for today. This is a personal note, not an assessment."
            } catch (err: Exception) {
                error = err.message ?: "The check-in could not be saved."
            }
        }
    }

    fun send(text: String) {
        val content = text.trim()
        if (content.isEmpty()) return
        viewModelScope.launch {
            busy = true
            error = ""
            val now = Instant.now().toString()
            messages.add(ChatItem(UUID.randomUUID().toString(), "user", content, now))
            try {
                if (signedIn && serverUp) {
                    val reply = withContext(Dispatchers.IO) {
                        if (remoteConversationId == null) {
                            val created = api.createConversation(mode, keepChat).getJSONObject("data")
                            remoteConversationId = created.getString("id")
                        }
                        api.sendMessage(remoteConversationId!!, content).getJSONObject("data")
                    }
                    val assistant = reply.getJSONObject("assistantMessage")
                    messages.add(ChatItem(assistant.getString("id"), "assistant", assistant.getString("content"), assistant.optString("createdAt")))
                } else {
                    val reply = practiceReply(mode, content)
                    messages.add(ChatItem(UUID.randomUUID().toString(), "assistant", reply.content, now))
                }
                persist()
            } catch (err: Exception) {
                val reply = practiceReply(mode, content)
                messages.add(ChatItem(UUID.randomUUID().toString(), "assistant", reply.content, now))
                error = "The server did not take that message, so this reply stayed on the phone. ${err.message ?: ""}".trim()
            } finally {
                busy = false
            }
        }
    }

    fun newConversation() {
        remoteConversationId = null
        messages.clear()
        messages.add(ChatItem(UUID.randomUUID().toString(), "assistant", "Hi. This is your private space to share. What’s on your mind?", "now"))
        persist()
    }

    fun saveJournal(title: String, body: String) {
        if (body.trim().isEmpty()) {
            error = "Write a little before saving. It can be one sentence."
            return
        }
        viewModelScope.launch {
            error = ""
            try {
                if (signedIn) withContext(Dispatchers.IO) { api.saveJournal(title.trim(), body.trim(), null, emptyList()) }
                journal.add(0, JournalItem(UUID.randomUUID().toString(), title.trim(), body.trim(), LocalDate.now().toString()))
                persist()
                sheet = "none"
            } catch (err: Exception) {
                error = err.message ?: "The entry could not be saved."
            }
        }
    }

    fun publish(body: String, category: String) {
        if (!guidelines) {
            sheet = "guidelines"
            return
        }
        if (body.trim().length < 10) {
            error = "Share at least a sentence or two."
            return
        }
        viewModelScope.launch {
            error = ""
            try {
                if (signedIn) {
                    withContext(Dispatchers.IO) { api.createPost(body.trim(), category) }
                    loadRemotePosts()
                } else {
                    posts.add(0, PostItem(UUID.randomUUID().toString(), alias, category, body.trim(), 0, 0, true))
                    persist()
                }
                sheet = "none"
            } catch (err: Exception) {
                error = err.message ?: "The post could not be shared."
            }
        }
    }

    fun support(post: PostItem) {
        viewModelScope.launch {
            try {
                if (signedIn && serverUp) withContext(Dispatchers.IO) { api.react(post.id, "support") }
                val index = posts.indexOfFirst { it.id == post.id }
                if (index >= 0) posts[index] = post.copy(support = post.support + 1)
                persist()
            } catch (err: Exception) {
                error = err.message ?: "That reaction could not be saved."
            }
        }
    }

    fun acceptGuidelines() {
        viewModelScope.launch {
            if (signedIn) {
                try {
                    withContext(Dispatchers.IO) { api.acceptGuidelines() }
                } catch (err: Exception) {
                    error = err.message ?: "The guidelines could not be saved on the server."
                    return@launch
                }
            }
            guidelines = true
            prefs.edit().putBoolean("guidelines", true).apply()
            sheet = "post"
        }
    }

    fun login(emailInput: String, password: String) {
        viewModelScope.launch {
            busy = true
            error = ""
            try {
                val data = withContext(Dispatchers.IO) {
                    api.login(emailInput.trim(), password).getJSONObject("data")
                }
                storeSession(data)
                sheet = "none"
                loadRemotePosts()
            } catch (err: Exception) {
                error = if (err is ApiException) err.message else "Sign-in did not succeed. Check the server address."
            } finally {
                busy = false
            }
        }
    }

    fun register(emailInput: String, password: String, name: String) {
        viewModelScope.launch {
            busy = true
            error = ""
            try {
                val data = withContext(Dispatchers.IO) {
                    api.register(emailInput.trim(), password, name.trim()).getJSONObject("data")
                }
                storeSession(data)
                notice = "Account created. Email delivery is not connected, so verification may still be required before you can post."
                sheet = "none"
            } catch (err: Exception) {
                error = err.message ?: "The account could not be created."
            } finally {
                busy = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { api.logout() }
            session.clear()
            signedIn = false
            email = ""
            remoteConversationId = null
        }
    }

    private fun storeSession(data: JSONObject) {
        session.accessToken = data.getString("accessToken")
        session.refreshToken = data.getString("refreshToken")
        val user = data.getJSONObject("user")
        session.email = user.optString("email")
        session.displayName = user.optJSONObject("profile")?.optString("displayName") ?: alias
        email = session.email
        signedIn = true
        secureTokens = session.encrypted
    }

    private fun loadRemotePosts() {
        viewModelScope.launch {
            if (!signedIn) return@launch
            runCatching {
                val rows = withContext(Dispatchers.IO) { api.posts() }
                posts.clear()
                for (index in 0 until rows.length()) {
                    val row = rows.getJSONObject(index)
                    val counts = row.optJSONObject("reactionCounts")
                    posts.add(
                        PostItem(
                            id = row.getString("id"),
                            name = row.optString("displayName", "Member"),
                            category = row.optString("category", "listen"),
                            body = row.optString("body"),
                            replies = row.optInt("commentCount"),
                            support = counts?.optInt("support") ?: 0,
                            mine = row.optBoolean("mine"),
                        ),
                    )
                }
            }
        }
    }

    private fun load() {
        val raw = prefs.getString("state", null)
        if (raw == null) {
            posts.add(PostItem("p1", "Quiet Sunrise", "encouragement", "Today was difficult, but I managed to get through it. Small steps still count.", 1, 3, false))
            posts.add(PostItem("p2", "Gentle Rain", "advice", "What helps you unwind after an overwhelming day?", 0, 2, false))
            return
        }
        val json = JSONObject(raw)
        readArray(json.optJSONArray("moods")) { row ->
            moods.add(MoodItem(row.getString("id"), row.getString("mood"), row.optString("note")))
        }
        readArray(json.optJSONArray("messages")) { row ->
            messages.add(ChatItem(row.getString("id"), row.getString("role"), row.getString("content"), row.optString("at")))
        }
        readArray(json.optJSONArray("journal")) { row ->
            journal.add(JournalItem(row.getString("id"), row.optString("title"), row.getString("body"), row.optString("date")))
        }
        readArray(json.optJSONArray("posts")) { row ->
            posts.add(PostItem(row.getString("id"), row.getString("name"), row.getString("category"), row.getString("body"), row.optInt("replies"), row.optInt("support"), row.optBoolean("mine")))
        }
    }

    private fun persist() {
        val json = prefs.getString("state", null)?.let { JSONObject(it) } ?: JSONObject()
        json.put("moods", JSONArray().apply { moods.forEach { put(JSONObject().put("id", it.id).put("mood", it.mood).put("note", it.note)) } })
        json.put("messages", JSONArray().apply { messages.forEach { put(JSONObject().put("id", it.id).put("role", it.role).put("content", it.content).put("at", it.at)) } })
        json.put("journal", JSONArray().apply { journal.forEach { put(JSONObject().put("id", it.id).put("title", it.title).put("body", it.body).put("date", it.date)) } })
        if (!signedIn) {
            json.put("posts", JSONArray().apply { posts.forEach { put(JSONObject().put("id", it.id).put("name", it.name).put("category", it.category).put("body", it.body).put("replies", it.replies).put("support", it.support).put("mine", it.mine)) } })
        }
        prefs.edit().putString("state", json.toString()).apply()
    }

    private fun readArray(array: JSONArray?, read: (JSONObject) -> Unit) {
        if (array == null) return
        for (index in 0 until array.length()) read(array.getJSONObject(index))
    }
}
