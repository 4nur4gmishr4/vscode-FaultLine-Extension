# Contributing to FaultLine

[![Build Status](https://img.shields.io/github/actions/workflow/status/4nur4gmishr4/vscode-fahh-Extension/ci.yml?branch=main&style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/actions)
[![License: MIT](https://img.shields.io/github/license/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![Issues](https://img.shields.io/github/issues/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/issues)
[![Stars](https://img.shields.io/github/stars/4nur4gmishr4/vscode-fahh-Extension?style=flat-square)](https://github.com/4nur4gmishr4/vscode-fahh-Extension/stargazers)

Thank you for your interest in contributing to FaultLine. This project relies on community contributions to remain robust and efficient. 

## Development Setup

To set up the project locally:

1. Ensure you have Node.js and npm installed on your machine.
2. Clone the repository and navigate into the project directory.
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Compile the extension and package it:
   ```bash
   npm run compile
   npx vsce package
   ```

## Development Guidelines

- **Code Quality**: Ensure that all new features or bug fixes maintain strict type safety. Do not leave orphaned configurations or unused variables in the codebase.
- **Testing**: Test the extension locally by installing the `.vsix` file in your VS Code environment or by using the VS Code Extension Development Host (F5). Ensure audio playback has zero latency and terminal detection operates without blocking the main editor thread.
- **Pull Requests**: Submit clear and concise pull requests. Detail the issue you are resolving and the architectural decisions made in your implementation.

Developed by Anurag Mishra (4nur4gmishr4).
