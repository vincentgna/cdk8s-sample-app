import { App } from "cdk8s";

import { SampleChart } from "./SampleChart";

const app = new App();
new SampleChart(app, "Sample", {
  portNumber: 9899,
  cpuAutoScaleThreshold: 60,
});
app.synth();
