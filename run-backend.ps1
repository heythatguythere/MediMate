# Run MediMate Backend
Write-Host "Starting MediMate Backend..." -ForegroundColor Green

$env:MAVEN_OPTS="-Dmaven.multiModuleProjectDirectory=$PSScriptRoot\backend"

# Check if Maven is installed
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Set-Location "$PSScriptRoot\backend"
    mvn spring-boot:run
} else {
    Write-Host "Maven not found. Downloading and using Maven wrapper..." -ForegroundColor Yellow
    
    $wrapperJar = "$PSScriptRoot\backend\.mvn\wrapper\maven-wrapper.jar"
    
    if (!(Test-Path $wrapperJar)) {
        Write-Host "Downloading Maven wrapper JAR..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar" -OutFile $wrapperJar
    }
    
    Set-Location "$PSScriptRoot\backend"
    
    $basedir = "$PSScriptRoot\backend"
    & java `
        "-Dmaven.multiModuleProjectDirectory=$basedir" `
        "-Dclassworlds.conf=$basedir\.mvn\wrapper\maven-wrapper.properties" `
        -classpath "$wrapperJar" `
        "org.apache.maven.wrapper.MavenWrapperMain" `
        spring-boot:run
}
