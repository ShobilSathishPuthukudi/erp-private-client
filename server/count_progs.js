import { models } from './src/models/index.js'; const { Program } = models; console.log(await Program.count()); process.exit(0);
