package com.airout.mobile.listener

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ListenerTest {
    @Test
    fun exhaustionReplyMatchesTheListeningExample() {
        val reply = practiceReply("listen", "I'm exhausted. Nobody seems to appreciate what I do.")
        assertTrue(reply.content.contains("That sounds exhausting"))
        assertTrue(reply.content.contains("simply listen"))
        assertTrue(reply.simulated)
        assertFalse(reply.safety.escalated)
    }

    @Test
    fun crisisReplyOffersAPublishedDirectory() {
        val reply = practiceReply("listen", "I want to die")
        assertTrue(reply.safety.escalated)
        assertTrue(reply.content.contains("findahelpline.com"))
        assertTrue(reply.content.contains("not an emergency service"))
    }
}
