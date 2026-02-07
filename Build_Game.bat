@echo off
setlocal
cd /d "%~dp0"

echo ----------------------------------------------------------------------
echo                OPERATION CYBERSPACE - BUILD SCRIPT
echo ----------------------------------------------------------------------

:: 1. Install Dependencies
echo.
echo [1/5] Installing Dependencies...
call npm install
if %errorlevel% neq 0 goto :error

:: 2. Install Packager (if not present)
echo.
echo [2/5] Checking for Electron Packager...
if not exist "node_modules\.bin\electron-packager.cmd" (
    echo Installing @electron/packager...
    call npm install @electron/packager --save-dev
)

:: 3. Build Windows
echo.
echo [3/5] Building Windows Executable...
call npx @electron/packager . "Operation Cyberspace" --platform=win32 --arch=x64 --out=dist --overwrite --ignore="^\.git" --ignore="^dist" --prune=true
if %errorlevel% neq 0 goto :error

:: Verify Windows Build
if not exist "dist\Operation Cyberspace-win32-x64\Operation Cyberspace.exe" (
    echo [ERROR] Windows build failed. The .exe was not created.
    goto :error
)

:: 4. Build macOS
echo.
echo [4/5] Building macOS App...
call npx @electron/packager . "Operation Cyberspace" --platform=darwin --arch=x64 --out=dist --overwrite --ignore="^\.git" --ignore="^dist"
:: Note: macOS builds on Windows might have permission issues with the .app bundle structure, but files will be there.

:: 5. Move to Downloads
echo.
echo [5/5] Moving to Downloads...
set "DL_DIR=%USERPROFILE%\Downloads\OperationCyberspace_Builds"
if not exist "%DL_DIR%" mkdir "%DL_DIR%"

echo Copying Windows build...
xcopy "dist\Operation Cyberspace-win32-x64" "%DL_DIR%\Windows" /E /I /Y /Q

echo Copying macOS build...
xcopy "dist\Operation Cyberspace-darwin-x64" "%DL_DIR%\macOS" /E /I /Y /Q

echo.
echo ----------------------------------------------------------------------
echo    SUCCESS! Builds located in:
echo    %DL_DIR%
echo.
echo    NOTE: If Windows SmartScreen blocks the app:
echo    Click "More info" -> "Run anyway"
echo ----------------------------------------------------------------------
pause
exit /b 0

:error
echo.
echo [ERROR] An error occurred during the build process.
pause
exit /b 1
