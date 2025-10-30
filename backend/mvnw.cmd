@REM Maven Wrapper startup script for Windows
@echo off
setlocal

set BASEDIR=%~dp0
set WRAPPER_JAR=%BASEDIR%.mvn\wrapper\maven-wrapper.jar
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

if not exist "%WRAPPER_JAR%" (
    echo Downloading Maven Wrapper...
    powershell -Command "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar' -OutFile '%WRAPPER_JAR%'"
)

set MAVEN_CMD_LINE_ARGS=%*
java -Dmaven.multiModuleProjectDirectory="%BASEDIR%" "-Dclassworlds.conf=%BASEDIR%.mvn\wrapper\maven-wrapper.properties" -classpath "%WRAPPER_JAR%" "-Dmaven.home=%BASEDIR%" "-Dmaven.repo.local=%USERPROFILE%\.m2\repository" %WRAPPER_LAUNCHER% %MAVEN_CMD_LINE_ARGS%
