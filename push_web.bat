@SET TORTOISE_PATH=%ProgramW6432%\TortoiseSVN\bin\TortoiseProc.exe
@SET DEST=..\..\SRC2\web\dashingstrike.com\LudumDare\LD55\

xcopy /SY dist\game\build.dev\client %DEST%

"%TORTOISE_PATH%" /command:commit /path:%DEST%  /logmsg:"LD55"

@pushd ..\..\SRC2\flightplans

@echo.
@echo.
@echo NEXT: Run `npm run web-prod` in the Node 12 shell
@node12shell