rootProject.name = "mobile"
include(":app")
project(":app").projectDir = file("android/app")

// Include the android folder as a build if needed, but usually we just want the app module.
// Actually, for Flutter, the 'android' folder is the gradle root.
// If we want to make the root 'mobile' a gradle project:
include(":android")
project(":android").projectDir = file("android")
