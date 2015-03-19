@echo off

if not exist "node_modules" (
    npm install jsdoc
    npm install replace

    cd ..\client\js

    for %%i in (*.js) do (
      ..\..\doc\node_modules\.bin\jsdoc %%i -d ..\..\doc\jsdoc\client\%%~ni
      node ..\..\doc\replace.js %%~ni
    )
)

cd ..\client\js

for %%i in (*.js) do (
  ..\..\doc\node_modules\.bin\jsdoc %%i -d ..\..\doc\jsdoc\client\%%~ni
  node ..\..\doc\replace.js %%~ni
)
