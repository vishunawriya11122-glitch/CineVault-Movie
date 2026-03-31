# CineVault ProGuard Rules
-keep class com.cinevault.app.data.model.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep JavaScript interface methods for YouTube WebView player
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
