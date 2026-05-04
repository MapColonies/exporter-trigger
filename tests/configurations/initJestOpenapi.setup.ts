import path from 'node:path';
import { expect } from 'vitest';
import jestOpenApi from 'jest-openapi';

//@ts-ignore
globalThis.expect = expect;

jestOpenApi(path.join(process.cwd(), 'openapi3.yaml'));
