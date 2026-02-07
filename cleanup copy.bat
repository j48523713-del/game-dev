@echo off
title Operation Cyberspace - Cleanup
echo ==========================================
echo      CLEANING UP PROJECT FILES
echo ==========================================

echo [1/3] Deleting unused files...
if exist lobby.js del lobby.js
if exist menu.js del menu.js
if exist ui.js del ui.js
if exist map.js del map.js
if exist Client\map.js del Client\map.js

echo [2/3] Consolidating Client and Server folders...
REM Move Server files to root
if exist "Server\server.py" move "Server\server.py" .
if exist "Server\start_server.bat" move "Server\start_server.bat" .
if exist "Server\dashboard.html" move "Server\dashboard.html" .
if exist "Server\user_data" move "Server\user_data" .
if exist "Server\custom_suits.json" move "Server\custom_suits.json" .

REM Move Client files to root
if exist "Client\sketch.js" move "Client\sketch.js" .
if exist "Client\game.js" move "Client\game.js" .
if exist "Client\maker.js" move "Client\maker.js" .
if exist "Client\p5.sound.min.js" move "Client\p5.sound.min.js" .
if exist "Client\index.html" move "Client\index.html" .
if exist "Client\maker.html" move "Client\maker.html" .
if exist "Client\style.css" move "Client\style.css" .
if exist "Client\player_assets" move "Client\player_assets" .
if exist "Client\libraries" move "Client\libraries" .
if exist "Client\assets" move "Client\assets" .

echo [3/3] Removing empty folders...
if exist Client rmdir /s /q Client
if exist Server rmdir /s /q Server

echo [DONE] Project cleaned. Run 'start_server.bat' to play.
pause