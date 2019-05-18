# casparcg-hyperdeck
Hyperdeck "interface" for CasparCG to enable integration in BMD ATEM switchers.

This is project abstract certain features of CasparCG inside an interface following the BMD Hyperdeck protocol specification.

Therefore CasparCG can be controlled from within in BMD ATEM video switcher.

## Notes

Currently there are two applications:
- a simple "clip server" providing access to video files inside the media folder of CasparCG
- a "template server" loading, playing and stoping templates with data from a CSV file

## Building

1. Make sure to checkout all submodules and run `npm init` inside the submodules
2. Execute `npm run build-win32` to create two .exe files for the two applications.
