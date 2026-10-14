allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.layout.buildDirectory.set(file("../build"))
val newBuildDir: Directory = rootProject.layout.buildDirectory.get()

subprojects {
    val projectDir = project.projectDir.absolutePath
    if (projectDir.startsWith("C:") && !newBuildDir.asFile.absolutePath.startsWith("C:")) {
        // Redirect plugins on C: to a writable folder on C: to avoid cross-drive relative path issues in AGP
        val userHome = System.getProperty("user.home")
        val pluginBuildDir = file("$userHome/.flutter_build/${rootProject.name}/${project.name}")
        project.layout.buildDirectory.set(pluginBuildDir)
    } else {
        val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
        project.layout.buildDirectory.value(newSubprojectBuildDir)
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
