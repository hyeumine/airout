package com.airout.mobile.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class MoodFace(val id: String, val label: String, val face: String, val tint: Color)

private val moods = listOf(
    MoodFace("happy", "Happy", "😊", Color(0xFFFFE4EE)),
    MoodFace("calm", "Calm", "😌", Color(0xFFDDF6F1)),
    MoodFace("neutral", "Neutral", "😐", Color(0xFFF3E8FF)),
    MoodFace("sad", "Sad", "😔", Color(0xFFE4ECFF)),
    MoodFace("anxious", "Anxious", "😟", Color(0xFFFFF1D6)),
    MoodFace("frustrated", "Frustrated", "😣", Color(0xFFFDE2E4)),
    MoodFace("exhausted", "Exhausted", "😴", Color(0xFFE8E4F8)),
)

private val categories = listOf(
    "listen" to "I Need Someone to Listen",
    "advice" to "Seeking Advice",
    "encouragement" to "Words of Encouragement",
    "victory" to "Small Victories",
    "gratitude" to "Gratitude",
    "reflection" to "Personal Reflections",
)

private val modes = listOf(
    "listen" to "Just Listen",
    "reflect" to "Help Me Reflect",
    "encourage" to "Encourage Me",
)

@Composable
fun AiroutApp(model: AppModel) {
    if (model.sheet != "none") {
        Sheet(model)
        return
    }
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                NavItem("home", "Home", Icons.Filled.Home, model)
                NavItem("community", "Community", Icons.Filled.Favorite, model)
                NavigationBarItem(
                    selected = model.tab == "listen",
                    onClick = { model.tab = "listen" },
                    icon = {
                        Box(
                            modifier = Modifier.size(46.dp).clip(CircleShape).background(Primary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = "Listen", tint = Color.White)
                        }
                    },
                    label = { Text("") },
                )
                NavItem("journal", "Journal", Icons.Filled.Book, model)
                NavItem("profile", "Profile", Icons.Filled.Person, model)
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (model.tab) {
                "community" -> CommunityScreen(model)
                "listen" -> ListenScreen(model)
                "journal" -> JournalScreen(model)
                "profile" -> ProfileScreen(model)
                else -> HomeScreen(model)
            }
        }
    }
}

@Composable
private fun NavItem(id: String, label: String, icon: ImageVector, model: AppModel) {
    NavigationBarItem(
        selected = model.tab == id,
        onClick = { model.tab = id },
        icon = { Icon(icon, contentDescription = label) },
        label = { Text(label) },
    )
}

@Composable
private fun HomeScreen(model: AppModel) {
    var selected by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("AIrOut", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
        Box(Modifier.padding(top = 4.dp).width(72.dp).height(3.dp).clip(RoundedCornerShape(99.dp)).background(Primary))
        Spacer(Modifier.height(16.dp))
        Text("Hi, ${model.greetingName}", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        Text("How are you feeling today?", color = Muted, fontSize = 18.sp)
        Spacer(Modifier.height(12.dp))
        Banner(
            if (model.signedIn) "Signed in. Your journal and chats can stay with your account."
            else if (model.serverUp) "On this phone for now. The shared server is reachable when you sign in."
            else "On this phone for now. Listening and journaling still work without the server.",
        )
        if (model.error.isNotBlank() && model.tab == "home") Text(model.error, color = Color(0xFF9C3B4A))
        if (model.notice.isNotBlank()) Text(model.notice, color = Muted)
        SoftCard {
            Text("Today", fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                moods.take(4).forEach { face -> MoodTile(face, selected == face.id) { selected = face.id } }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                moods.drop(4).forEach { face -> MoodTile(face, selected == face.id) { selected = face.id } }
            }
            Text(moods.find { it.id == selected }?.label ?: "Choose what feels closest.", color = Muted, modifier = Modifier.padding(top = 8.dp))
            OutlinedTextField(note, { note = it }, label = { Text("A short note") }, modifier = Modifier.fillMaxWidth())
            PillButton("Save check-in") {
                model.saveMood(selected, note)
                note = ""
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ActionTile("Listen", "A private space to talk.", Blush, Modifier.weight(1f)) { model.tab = "listen" }
            ActionTile("Community", "People who will hear you.", Sky, Modifier.weight(1f)) { model.tab = "community" }
        }
        SoftCard {
            Text("Recent check-ins", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            Text("A gentle look back. This is a memory, not a diagnosis.", color = Muted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                model.moods.take(7).forEach { item ->
                    val face = moods.find { it.id == item.mood }
                    Text(face?.face ?: "·", modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(face?.tint ?: Lilac).padding(8.dp))
                }
            }
            model.moods.firstOrNull()?.note?.takeIf { it.isNotBlank() }?.let { Text(it, color = Muted, modifier = Modifier.padding(top = 8.dp)) }
        }
        Text("AIrOut is a listening companion, not a therapist and not emergency help.", color = Muted)
    }
}

@Composable
private fun ListenScreen(model: AppModel) {
    var draft by rememberSaveable { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Text("AIrOut", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 12.dp))
        Text("A listening companion, not a therapist or an emergency service.", color = Muted)
        Banner(if (model.signedIn && model.keepChat) "This conversation is kept with your account until you delete it." else "Replies on this phone come from a practice listener until the server answers.")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            modes.forEach { (id, label) ->
                FilterChip(selected = model.mode == id, onClick = { model.mode = id }, label = { Text(label) })
            }
        }
        FilterChip(selected = model.keepChat, onClick = { model.keepChat = !model.keepChat }, label = { Text("Keep until I delete it") })
        LazyColumn(Modifier.weight(1f).padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(model.messages, key = { it.id }) { message ->
                val mine = message.role == "user"
                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                    Text(
                        message.content,
                        color = if (mine) Color(0xFF3A2458) else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.fillMaxWidth(0.82f).clip(RoundedCornerShape(22.dp)).background(if (mine) Bubble else MaterialTheme.colorScheme.surface).padding(14.dp),
                    )
                }
            }
            if (model.busy) item { Text("AIrOut is listening…", color = Muted) }
        }
        if (model.error.isNotBlank()) Text(model.error, color = Color(0xFF9C3B4A))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                draft,
                { draft = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Tell me what’s on your mind...") },
                shape = RoundedCornerShape(24.dp),
            )
            Spacer(Modifier.width(8.dp))
            Button(onClick = { model.send(draft); draft = "" }, shape = CircleShape, contentPadding = ButtonDefaults.ContentPadding) {
                Icon(Icons.Filled.Send, contentDescription = "Send privately")
            }
        }
        TextButton(onClick = { model.newConversation() }) { Text("New conversation") }
    }
}

@Composable
private fun CommunityScreen(model: AppModel) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Community wall", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        Text("Newest posts first. Support is not a score, and posts are not ranked by reactions.", color = Muted)
        Spacer(Modifier.height(8.dp))
        Banner(if (model.signedIn) "You are in the shared community. Names here are nicknames." else "This wall is on this phone, including the sample posts.")
        if (model.error.isNotBlank() && model.tab == "community") Text(model.error, color = Color(0xFF9C3B4A))
        PillButton("Share something") { model.sheet = if (model.guidelines) "post" else "guidelines" }
        model.posts.forEach { post ->
            SoftCard {
                Text(post.name, fontWeight = FontWeight.ExtraBold)
                Text(categories.find { it.first == post.category }?.second ?: post.category, color = Primary, fontSize = 12.sp)
                Text(post.body, modifier = Modifier.padding(vertical = 8.dp))
                Text("${post.replies} replies", color = Muted, fontSize = 12.sp)
                TextButton(onClick = { model.support(post) }) { Text("Sending Support ${post.support}") }
            }
        }
    }
}

@Composable
private fun JournalScreen(model: AppModel) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Text("Personal journal", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        Text("Private by default. Entries are not posted to the community.", color = Muted)
        Banner(if (model.signedIn) "Saved to your account when the server accepts them." else "Stored on this phone. This storage is not encrypted.")
        PillButton("New entry") { model.sheet = "journal" }
        if (model.journal.isEmpty()) {
            SoftCard { Text("Your journal is quiet", fontWeight = FontWeight.Bold); Text("A few honest sentences are enough.", color = Muted) }
        }
        model.journal.forEach { entry ->
            SoftCard {
                Text(entry.date, color = Muted, fontSize = 12.sp)
                if (entry.title.isNotBlank()) Text(entry.title, fontWeight = FontWeight.Bold)
                Text(entry.body)
            }
        }
    }
}

@Composable
private fun ProfileScreen(model: AppModel) {
    var name by rememberSaveable { mutableStateOf(model.alias) }
    var server by rememberSaveable { mutableStateOf(model.apiBase) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Box(Modifier.size(72.dp).clip(CircleShape).background(Lilac), contentAlignment = Alignment.Center) {
            Text(model.greetingName.take(1).uppercase(), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
        }
        Text("Your space", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 12.dp))
        Text("Your account and your nickname are separate.", color = Muted)
        Banner(if (model.secureTokens) "Sign-in tokens on this phone use the Android keystore." else "Sign-in tokens fell back to app storage on this device.")
        SoftCard {
            OutlinedTextField(name, { name = it }, label = { Text("Community nickname") }, modifier = Modifier.fillMaxWidth())
            PillButton("Save nickname") { model.setNickname(name) }
            Text(if (model.signedIn) "Signed in as ${model.email}. This email is only visible to you." else "You are using this phone without an account.", color = Muted)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("system" to "Match device", "light" to "Light", "dark" to "Dark").forEach { (id, label) ->
                FilterChip(selected = model.theme == id, onClick = { model.setAppearance(id) }, label = { Text(label) })
            }
        }
        SoftCard {
            OutlinedTextField(server, { server = it }, label = { Text("API address") }, modifier = Modifier.fillMaxWidth())
            Text("The emulator reaches this computer at 10.0.2.2. A phone on Wi-Fi needs your computer’s address.", color = Muted)
            PillButton("Save address") { model.setApi(server) }
        }
        if (model.signedIn) OutlinedButton(onClick = { model.logout() }, modifier = Modifier.fillMaxWidth()) { Text("Sign out") }
        else {
            PillButton("Sign in") { model.sheet = "login" }
            OutlinedButton(onClick = { model.sheet = "register" }, modifier = Modifier.fillMaxWidth()) { Text("Create account") }
        }
        Text("This app is not a substitute for professional mental health care. A practice listener is not a live model.", color = Muted, modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable
private fun Sheet(model: AppModel) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).verticalScroll(rememberScrollState()).padding(20.dp)) {
        TextButton(onClick = { model.sheet = "none"; model.error = "" }) { Text("Back") }
        if (model.error.isNotBlank()) Text(model.error, color = Color(0xFF9C3B4A), modifier = Modifier.padding(bottom = 8.dp))
        when (model.sheet) {
            "login" -> AuthForm(model, register = false)
            "register" -> AuthForm(model, register = true)
            "journal" -> JournalForm(model)
            "post" -> PostForm(model)
            "guidelines" -> Guidelines(model)
        }
    }
}

@Composable
private fun AuthForm(model: AppModel, register: Boolean) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf(model.alias) }
    Text(if (register) "Create account" else "Sign in", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
    if (register) OutlinedTextField(name, { name = it }, label = { Text("Nickname") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(password, { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
    Text("Use at least 10 characters, with a letter and a number.", color = Muted)
    PillButton(if (model.busy) "Working…" else if (register) "Create account" else "Sign in") {
        if (register) model.register(email, password, name) else model.login(email, password)
    }
}

@Composable
private fun JournalForm(model: AppModel) {
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    Text("New reflection", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
    Text("Only you can read this.", color = Muted)
    OutlinedTextField(title, { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(body, { body = it }, label = { Text("Entry") }, modifier = Modifier.fillMaxWidth().height(160.dp))
    PillButton("Save reflection") { model.saveJournal(title, body) }
}

@Composable
private fun PostForm(model: AppModel) {
    var body by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("listen") }
    Text("Share", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
    categories.forEach { (id, label) ->
        FilterChip(selected = category == id, onClick = { category = id }, label = { Text(label) })
    }
    OutlinedTextField(body, { body = it }, label = { Text("Post") }, modifier = Modifier.fillMaxWidth().height(140.dp))
    PillButton("Share") { model.publish(body, category) }
}

@Composable
private fun Guidelines(model: AppModel) {
    Text("Community guidelines", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
    listOf(
        "Listen before you advise. Some people only want to be heard.",
        "Share your own experience. Do not diagnose or recommend medication.",
        "Use a nickname. Do not post real names, emails, or phone numbers.",
        "These spaces are peers supporting peers. They are not therapy groups.",
    ).forEach { line -> SoftCard { Text(line) } }
    PillButton("I understand") { model.acceptGuidelines() }
}

@Composable
private fun MoodTile(face: MoodFace, selected: Boolean, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier
            .size(64.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(face.tint)
            .border(if (selected) 2.dp else 0.dp, if (selected) Primary else Color.Transparent, RoundedCornerShape(18.dp)),
    ) {
        Text(face.face, fontSize = 24.sp)
    }
}

@Composable
private fun ActionTile(title: String, body: String, tint: Color, modifier: Modifier, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = modifier.height(140.dp), shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = tint)) {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.Bottom) {
            Spacer(Modifier.weight(1f))
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Ink)
            Text(body, color = Ink)
        }
    }
}

@Composable
private fun SoftCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(18.dp)) { content() }
    }
}

@Composable
private fun Banner(text: String) {
    Text(text, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clip(RoundedCornerShape(20.dp)).background(Warm).padding(14.dp), color = Ink)
}

@Composable
private fun PillButton(label: String, onClick: () -> Unit) {
    Button(onClick = onClick, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(52.dp), shape = RoundedCornerShape(99.dp)) {
        Text(label)
    }
}
