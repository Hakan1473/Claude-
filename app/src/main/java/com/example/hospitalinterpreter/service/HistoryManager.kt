package com.example.hospitalinterpreter.service

import android.content.Context
import android.content.SharedPreferences
import com.example.hospitalinterpreter.model.ConversationHistoryItem
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class HistoryManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("hospital_interpreter_history", Context.MODE_PRIVATE)

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val KEY_HISTORY = "conversation_history_list"

    fun getHistory(): List<ConversationHistoryItem> {
        val raw = prefs.getString(KEY_HISTORY, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<ConversationHistoryItem>>(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveConversation(item: ConversationHistoryItem) {
        val current = getHistory().toMutableList()
        current.removeAll { it.id == item.id }
        current.add(0, item)
        prefs.edit().putString(KEY_HISTORY, json.encodeToString(current.take(50))).apply()
    }

    fun deleteConversation(id: String) {
        val current = getHistory().filterNot { it.id == id }
        prefs.edit().putString(KEY_HISTORY, json.encodeToString(current)).apply()
    }

    fun clearAll() {
        prefs.edit().remove(KEY_HISTORY).apply()
    }
}
