import { DatadogMonitor } from "@vincentgna/cdk8s-datadog";
import { Chart, Duration } from "cdk8s";
import { Deployment } from "cdk8s-plus-25";
import * as kplus from "cdk8s-plus-25";
import { Construct } from "constructs";

export interface SampleChartProps {
  /**
   * the port number to expose the service on
   *
   * @default 9898
   */
  portNumber?: number;
  /**
   * CPU AutoScale threshhold (%) to trigger autoscaling
   *
   * @default 80
   */
  cpuAutoScaleThreshold?: number;
  /**
   * CPU Monitor threshhold (%) to trigger an alert
   *
   * @default ${cpuAutoScaleThreshold} + 10
   */
  cpuMonitorThreshold?: number;
}

// https://github.com/cdk8s-team/cdk8s-examples/blob/431e9297ea4a7493fc1d7d2bad1ce8daf09cbfbd/typescript/cdk8s-plus-pod-info/index.ts
export class SampleChart extends Chart {
  constructor(scope: Construct, id: string, props: SampleChartProps = {}) {
    super(scope, id);

    const portNumber = props.portNumber ?? 9898;
    const cpuAutoScaleThreshold = props.cpuAutoScaleThreshold ?? 80;
    const cpuMonitorThreshold =
      props.cpuMonitorThreshold ?? cpuAutoScaleThreshold + 10;

    const deployment = new Deployment(this, "Deployment");

    // https://docs.datadoghq.com/containers/kubernetes/tag/?tab=containerizedagent#tag-autodiscovery
    deployment.metadata.addAnnotation(
      "ad.datadoghq.com/tags",
      JSON.stringify({
        SAMPLE_TAG: "foo",
      }),
    );

    const container = deployment.addContainer({
      image: "stefanprodan/podinfo:3.0.0",
      command: [
        "./podinfo",
        `--port=${portNumber}`,
        "--level=info",
        "--random-error=true",
      ],
      imagePullPolicy: kplus.ImagePullPolicy.IF_NOT_PRESENT,
      portNumber,
      liveness: kplus.Probe.fromCommand(
        ["podcli", "check", "http", `localhost:${portNumber}/healthz`],
        {
          initialDelaySeconds: Duration.seconds(1),
          timeoutSeconds: Duration.seconds(5),
        },
      ),
      readiness: kplus.Probe.fromCommand(
        ["podcli", "check", "http", `localhost:${portNumber}/readyz`],
        {
          initialDelaySeconds: Duration.seconds(1),
          timeoutSeconds: Duration.seconds(5),
        },
      ),
    });
    container.env.addVariable(
      "PODINFO_UI_MESSAGE",
      kplus.EnvValue.fromValue("this is my podinfo message"),
    );
    container.mount("/data", kplus.Volume.fromEmptyDir(this, "data", "data"));

    new kplus.HorizontalPodAutoscaler(this, "HPA", {
      target: deployment,
      maxReplicas: 100,
      minReplicas: 2,
      metrics: [
        kplus.Metric.resourceCpu(
          kplus.MetricTarget.averageUtilization(cpuAutoScaleThreshold),
        ),
      ],
    });

    // Trigger alert if CPU usage isn't resolved by autoscaling
    new DatadogMonitor(this, "CpuUtilizationMonitor", {
      metadata: {
        name: `${deployment.name}-cpu-utilisation`,
      },
      spec: {
        name: "[CDK8s] podinfo pod cpu utilisation is too high, review Autoscaling triggers",
        type: "metric alert",
        query: `avg(last_5m):sum:docker.cpu.usage{kube_deployment:${deployment.name}} > ${cpuMonitorThreshold}`,
        message: `CPU Usage over ${cpuMonitorThreshold} for the last 5min`,
      },
    });
    const service = deployment.exposeViaService();

    service.exposeViaIngress("/*");
  }
}
