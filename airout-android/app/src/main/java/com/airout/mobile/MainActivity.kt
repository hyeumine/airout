package com.airout.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import com.airout.mobile.ui.AiroutApp
import com.airout.mobile.ui.AiroutTheme
import com.airout.mobile.ui.AppModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val model: AppModel = viewModel()
            val dark = when (model.theme) {
                "dark" -> true
                "light" -> false
                else -> isSystemInDarkTheme()
            }
            AiroutTheme(dark) {
                AiroutApp(model)
            }
        }
    }
}
