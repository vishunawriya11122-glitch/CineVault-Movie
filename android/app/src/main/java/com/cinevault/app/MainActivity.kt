package com.cinevault.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import com.cinevault.app.ui.components.UpdateDialog
import com.cinevault.app.ui.navigation.CineVaultNavHost
import com.cinevault.app.ui.theme.CineVaultTheme
import com.cinevault.app.ui.viewmodel.AppViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CineVaultTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = CineVaultTheme.colors.background
                ) {
                    val appViewModel: AppViewModel = hiltViewModel()
                    val updateInfo by appViewModel.updateInfo.collectAsState()

                    CineVaultNavHost()

                    updateInfo?.let { info ->
                        UpdateDialog(
                            info = info,
                            onDismiss = { appViewModel.dismissUpdate() }
                        )
                    }
                }
            }
        }
    }
}
