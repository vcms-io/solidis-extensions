<p align="center" width="100%">
  <img src="https://resources.vcms.io/assets/solidis.png" alt="Solidis" width="300"/>
</p>

<h1 align="center">@vcms-io/solidis-extensions</h1>

<p align="center">
  <b>Extensions for Solidis</b>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-supported-extensions">Supported Extensions</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vcms-io/solidis-extensions"><img src="https://img.shields.io/npm/v/@vcms-io/solidis-extensions.svg" alt="npm version"></a>
  <a href="https://github.com/vcms-io/solidis"><img src="https://img.shields.io/badge/TypeScript-✓-blue" alt="TypeScript"></a>
  <a href="https://github.com/vcms-io/solidis"><img src="https://img.shields.io/badge/ESM/CJS-✓-yellow" alt="ESM/CJS"></a>
  <a href="https://github.com/vcms-io/solidis"><img src="https://img.shields.io/badge/RESP2/RESP3-✓-orange" alt="RESP2/RESP3"></a>
  <a href="https://github.com/vcms-io/solidis"><img src="https://img.shields.io/badge/Zero_Dependencies-✓-green" alt="Zero Dependencies"></a>
</p>

## 🔍 Overview

Solidis offers pre-defined extensions through its highly extensible architecture. This extensibility enables seamless addition of specialized commands while maintaining zero dependencies and enterprise-grade performance.

## 🧩 Supported Extensions

- **SpinLock** - [Documentation](/sources/domains/spinlock/README.md)
- **RedLock** - [Documentation](/sources/domains/redlock/README.md)

## ⚙️ Requirements

- Same as [Solidis](https://github.com/vcms-io/solidis)

## 📦 Installation

```bash
# Using npm
npm install @vcms-io/solidis-extensions

# Using yarn
yarn add @vcms-io/solidis-extensions

# Using pnpm
pnpm add @vcms-io/solidis-extensions
```

## 🤝 Contributing

Solidis is an open-source project and we welcome contributions from the community. Here's how you can contribute:

### 💻 Development Setup

```bash
# Clone the repository
git clone https://github.com/vcms-io/solidis-extensions.git
cd solidis-extensions

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### 📜 Contribution Guidelines

1. **Fork the Repository**: Start by forking the repository and then clone your fork.

2. **Create a Branch**: Create a branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Follow Code Style**:
   - Use TypeScript strict mode
   - Follow existing patterns and naming conventions

4. **Submit Pull Request**: Push your changes to your fork and submit a pull request.
   - Provide a clear description of the changes
   - Reference any related issues
   - Add appropriate documentation

### ✅ Code Quality Guidelines

- **TypeScript**: Use strict typing and avoid `any` types and `as` cast where possible
- **Dependencies**: Avoid adding new dependencies unless absolutely necessary
- **Performance**: Consider performance implications of your changes
- **Bundle Size**: Keep the bundle size minimal

### 🚀 Release Process

Solidis follows semantic versioning (SemVer):
- **Patch (0.0.x)**: Bug fixes and minor changes that don't affect the API
- **Minor (0.x.0)**: New features added in a backward compatible manner
- **Major (x.0.0)**: Breaking changes to the public API

## 📄 License

Licensed under the MIT. See [LICENSE](/LICENSE) for more information.
