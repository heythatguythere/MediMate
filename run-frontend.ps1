# Run MediMate Frontend
Write-Host "Starting MediMate Frontend..." -ForegroundColor Green

$env:MAVEN_OPTS="-Dmaven.multiModuleProjectDirectory=$PSScriptRoot\frontend"

# Check if Maven is installed
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Set-Location "$PSScriptRoot\frontend"
    mvn -Dprism.order=sw exec:java
} else {
    Write-Host "Maven not found. Downloading and using Maven wrapper..." -ForegroundColor Yellow
    
    $wrapperJar = "$PSScriptRoot\frontend\.mvn\wrapper\maven-wrapper.jar"
    
    if (!(Test-Path $wrapperJar)) {
        Write-Host "Downloading Maven wrapper JAR..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar" -OutFile $wrapperJar
    }
    
    Set-Location "$PSScriptRoot\frontend"
    
    $basedir = "$PSScriptRoot\frontend"
    & java `
        "-Dmaven.multiModuleProjectDirectory=$basedir" `
        "-Dclassworlds.conf=$basedir\.mvn\wrapper\maven-wrapper.properties" `
        -classpath "$wrapperJar" `
        "org.apache.maven.wrapper.MavenWrapperMain" `
        compile `
        "-Dprism.order=sw" `
        exec:java
}
