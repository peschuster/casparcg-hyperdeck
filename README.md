# casparcg-hyperdeck
Hyperdeck "interface" for CasparCG to enable integration in BMD ATEM switchers.

This project abstracts certain features of CasparCG inside an interface following the BMD Hyperdeck protocol specification.

Therefore CasparCG can be controlled from within an BMD ATEM video switcher.

## Notes

Currently there are two applications:
- a simple "clip server" providing access to video files inside the media folder of CasparCG
- a "template server" loading, playing and stoping templates with data from a CSV file

## Building

1. Checkout all submodules (`git submodule init && git submodule update`)
2. Change to `libs/node-osc` and run `npm install`
3. Change to `libs/casparcg-connection` and run `npm install` and `npm run build:main`
4. Change back to base directory of the project and run `npm install`
5. Run `npm run build-win32` to create two `.exe` files for the two applications (in `bin/`)
