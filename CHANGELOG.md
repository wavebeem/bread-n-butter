# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2020-08-13

### Added

- Method `parser.skip`
- Method `parser.next`
- Function `bnb.choice(...parsers)`

## [0.3.0] - 2020-08-12

### Added

- Function `bnb.all` (thanks [@sveyret] for the type signature)

## [0.2.0] - 2020-07-28

### Added

- Interface `SourceLocation`
- Interfaces `ActionResult`, `ActionOK`, `ActionFail`
- Interfaces `ParseOK`, `ParseFail`
- Class `Context`

## [0.1.0] - 2020-07-28

### Added

- ES Modules build

## [0.0.2] - 2020-07-27

### Fixed

- `parser.many1` was equivalent to `parser.many0`

## [0.0.1] - 2020-07-26

### Added

- Initial release

[@sveyret]: https://github.com/sveyret

## Unreleased
