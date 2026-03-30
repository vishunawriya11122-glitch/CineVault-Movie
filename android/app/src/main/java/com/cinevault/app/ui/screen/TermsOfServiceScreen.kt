package com.cinevault.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cinevault.app.ui.theme.CineVaultTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TermsOfServiceScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CineVaultTheme.colors.background),
    ) {
        TopAppBar(
            title = { Text("Terms of Service", style = CineVaultTheme.typography.sectionTitle, color = CineVaultTheme.colors.textPrimary) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = CineVaultTheme.colors.textPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = CineVaultTheme.colors.background),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            Text("Last updated: January 2025", fontSize = 12.sp, color = CineVaultTheme.colors.textSecondary)
            Spacer(Modifier.height(16.dp))

            TermsSection("1. Acceptance of Terms", """
By downloading, installing, or using CineVault, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            """.trimIndent())

            TermsSection("2. User Accounts", """
• You must be at least 13 years old to create an account
• You are responsible for maintaining the security of your account credentials
• You must provide accurate and complete information during registration
• One person may not maintain more than one account
            """.trimIndent())

            TermsSection("3. Acceptable Use", """
You agree not to:
• Use the service for any illegal purpose
• Share your account credentials with others
• Attempt to bypass any security measures
• Redistribute, copy, or download content for commercial purposes
• Use automated systems to access the service
• Harass, abuse, or harm other users
            """.trimIndent())

            TermsSection("4. Content", """
• All content available on CineVault is provided for personal, non-commercial viewing
• We reserve the right to modify, remove, or restrict access to any content at any time
• Content availability may vary by region
• Downloading content is permitted only for offline viewing within the app
            """.trimIndent())

            TermsSection("5. Intellectual Property", """
All content, trademarks, and intellectual property displayed on CineVault are owned by or licensed to us. You may not reproduce, distribute, or create derivative works without explicit permission.
            """.trimIndent())

            TermsSection("6. Termination", """
We reserve the right to suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the app settings.
            """.trimIndent())

            TermsSection("7. Limitation of Liability", """
CineVault is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
            """.trimIndent())

            TermsSection("8. Changes to Terms", """
We may update these Terms of Service from time to time. We will notify you of significant changes through the app. Continued use of the service after changes constitutes acceptance of the new terms.
            """.trimIndent())

            TermsSection("9. Contact", """
For questions about these Terms of Service, please contact us at cinevaultapp@gmail.com.
            """.trimIndent())

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun TermsSection(title: String, body: String) {
    Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = CineVaultTheme.colors.textPrimary)
    Spacer(Modifier.height(6.dp))
    Text(body, fontSize = 14.sp, color = CineVaultTheme.colors.textSecondary, lineHeight = 20.sp)
    Spacer(Modifier.height(20.dp))
}
