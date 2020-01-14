# casparcg-hyperdeck
Hyperdeck "interface" for CasparCG to enable integration in BMD ATEM switchers.

This project abstracts certain features of CasparCG inside an interface following the BMD Hyperdeck protocol specification.

Therefore CasparCG can be controlled from within an BMD ATEM video switcher.

## Notes

Currently there are two applications:
- a simple "clip server" providing access to video files inside the media folder of CasparCG
- a "template server" loading, playing and stoping templates with data from a CSV file

## Building

1. Make sure to checkout all submodules (`git clone https://github.com/peschuster/casparcg-hyperdeck.git --recursive`)
2. Run `npm install` inside the submodules (`libs/node-osc` and `libs/casparcg-connection`)
3. Run `npm run build` inside `libs/casparcg-connection``
4. Execute `npm run build-win32` to create two .exe files for the two applications.
