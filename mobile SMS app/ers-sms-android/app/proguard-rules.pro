# Proguard rules for ERS SMS
-keep class com.sms.gateway.data.model.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
