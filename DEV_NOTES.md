# Dev notes

## Bundling

The extension will be packed with webpack into the `dist` folder.

In `package.json` is the entry point set to the dist folder `"main": "./dist/extension.js"`

## Debugging

The `dist` order is also used for debugging. Here you can no longer perform a direct hot swap via Reload Extension.
Instead, you have to restart debugging so that the changes are applied.

If you want to have the debug on `out` as usual, then you have to change the following things:

- `launch.json`:
  - `outFiles`: `dist` to `out`
  - `"preLaunchTask": "${defaultBuildTask}"`
- `package.json`: `"main": "./out/extension.js"`

**Do not commit those changes!**

## Docker

Default, docker will use `localhost` as docker ip. If you want a different ip, then you should set `DOCKER_IP`.
