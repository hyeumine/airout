package com.airout.mobile.listener

data class CrisisResource(val name: String, val contact: String, val url: String)

data class SafetyAssessment(
    val escalated: Boolean,
    val message: String?,
    val resources: List<CrisisResource>,
)

data class ListenResult(
    val content: String,
    val simulated: Boolean,
    val safety: SafetyAssessment,
)

private val selfHarm = Regex(
    """\b(suicid(e|al)|kill myself|end my life|want to die|do not want to live|don't want to live|hurt myself|self[-\s]?harm|ending it all|can't go on|cannot go on|better off dead|take my own life|wish i were dead|wish i was dead)\b""",
    RegexOption.IGNORE_CASE,
)

private val harmOthers = Regex(
    """\bi(?:'m| am| will| plan to)?\s+(?:going to\s+)?(?:kill|hurt)\s+(?:him|her|them|someone)\b""",
    RegexOption.IGNORE_CASE,
)

private val resources = listOf(
    CrisisResource("Find a Helpline", "findahelpline.com", "https://findahelpline.com"),
    CrisisResource("IASP resources", "iasp.info", "https://www.iasp.info/suicidalthoughts/"),
    CrisisResource("988 Suicide & Crisis Lifeline", "988", "https://988lifeline.org"),
)

fun assessSafety(text: String): SafetyAssessment {
    val others = harmOthers.containsMatchIn(text)
    val self = selfHarm.containsMatchIn(text)
    if (!self && !others) return SafetyAssessment(false, null, emptyList())
    val message = if (others) {
        "I can’t help with harming someone. If there is any chance a person could get hurt, contact local emergency services now. If you are angry and need to talk without planning to hurt anyone, you can say that plainly and I will listen."
    } else {
        "I’m really glad you said something. I’m not an emergency service or a therapist, and you deserve a person who can stay with you. If you might act on thoughts of suicide or self-harm, contact local emergency services or a crisis line now. If you can, tell someone you trust."
    }
    return SafetyAssessment(true, message, resources)
}

fun practiceReply(mode: String, latest: String): ListenResult {
    val safety = assessSafety(latest)
    if (safety.message != null) {
        val lines = safety.resources.joinToString("\n") { "${it.name}: ${it.contact}" }
        val content = if (lines.isBlank()) safety.message else "${safety.message}\n\n$lines"
        return ListenResult(content, true, safety)
    }
    val text = latest.lowercase()
    val content = when {
        Regex("exhaust|tired|unappreciat|nobody|no one").containsMatchIn(text) -> when (mode) {
            "encourage" -> "Putting in that much effort and feeling unseen is heavy. The fact that you kept going says something steady about you. One small option, only if you want it, is to name a single task you can set down tonight."
            "reflect" -> "It sounds like the tiredness and the feeling of being overlooked are tangled together. What part of today felt most unnoticed?"
            else -> "That sounds exhausting, especially when your efforts feel unnoticed. Would you like to tell me what happened, or would you prefer that I simply listen?"
        }
        Regex("sad|lonely|cry|alone").containsMatchIn(text) -> when (mode) {
            "encourage" -> "Feeling alone with this hurts, and telling someone — even here — is a real step. You don’t have to brighten it up. If a tiny comfort would help, a glass of water or stepping outside is enough for this moment."
            "reflect" -> "That sadness sounds close. When the loneliness showed up today, what was happening around you?"
            else -> "That sounds painful. Thank you for sharing it. Would you like to tell me what has felt hardest, or should I simply stay with what you said?"
        }
        Regex("stress|anxious|overwhelm|worr|frustrat").containsMatchIn(text) -> when (mode) {
            "encourage" -> "A lot is asking for your attention at once, and it makes sense that your body feels tight. You can set the whole list down for a minute. If you want one small move, pick the single item that is actually due next."
            "reflect" -> "It sounds like a lot is stacked up. If you pictured one piece of it losing a little weight, which piece would that be?"
            else -> "It sounds like a lot is weighing on you. I can sit with that. Would it help to name one part, or would you rather just let it out?"
        }
        mode == "encourage" -> "I’m here for this moment with you, as a listening companion in the app. What you shared matters. If a next step would help, choose one small kindness toward yourself before you decide anything else."
        mode == "reflect" -> "Thank you for trusting me with that. What feels most important for us to understand about it right now?"
        else -> "I’m listening. What would you like me to understand about what you’re going through?"
    }
    return ListenResult(content, true, safety)
}
