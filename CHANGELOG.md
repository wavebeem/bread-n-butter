# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2020-11-18

### Changed

- `bnb.choice` now automatically detects the correct union type when using
  parsers of many different types (thanks [@seanchas116])

## [0.5.0] - 2020-11-17

### Changed

- Method `parser.many0()` is now `parser.repeat()`
- Method `parser.many1()` is now `parser.repeat(1)`
- Method `parser.sepBy0(separator)` is now `parser.sepBy(separator)`
- Method `parser.sepBy1(separator)` is now `parser.sepBy(separator, 1)`

### Added

- Method `parser.repeat(min = 0, max = Infinity)` (thanks [@seanchas116])
- Method `parser.sepBy(separator, min = 0, max = Infinity)` (thanks [@seanchas116])

## [0.4.1] - 2020-09-26

### Changed

- Documentation URL

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
[@seanchas116]: https://github.com/seanchas116
