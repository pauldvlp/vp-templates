#!/usr/bin/env node

import { runTemplateCLI } from '@pauldvlp/template-kit'

import template from '../src/template.ts'

process.exitCode = await runTemplateCLI(template)
