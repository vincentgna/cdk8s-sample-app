import * as path from "path";
import { ProjenStruct, Struct } from "@mrgrain/jsii-struct-builder";
import { Component, TextFile } from "projen";
import { Cdk8sTypeScriptApp } from "projen/lib/cdk8s/cdk8s-app-ts";

const outputDir = "util";

//https://github.com/DataDog/datadog-api-client-go/blob/v2.18.0/api/datadogV1/model_monitor_type.go#L16-L35
const monitorTypes = {
  AuditAlert: "audit alert",
  CiPipelinesAlert: "ci-pipelines alert",
  CiTestsAlert: "ci-tests alert",
  Composite: "composite",
  DatabaseMonitoringAlert: "database-monitoring alert",
  ErrorTrackingAlert: "error-tracking alert",
  EventAlert: "event alert",
  EventV2Alert: "event-v2 alert",
  LogAlert: "log alert",
  MetricAlert: "metric alert",
  ProcessAlert: "process alert",
  QueryAlert: "query alert",
  RumAlert: "rum alert",
  ServiceCheck: "service check",
  SloAlert: "slo alert",
  SyntheticsAlert: "synthetics alert",
  TraceAnalyticsAlert: "trace-analytics alert",
};

// https://github.com/DataDog/datadog-operator/blob/v1.2.1/controllers/datadogmonitor/controller.go#L45
const supportedMonitorTypes = [
  "AuditAlert",
  "EventAlert",
  "EventV2Alert",
  "LogAlert",
  "MetricAlert",
  "ProcessAlert",
  "QueryAlert",
  "RumAlert",
  "ServiceCheck",
  "SloAlert",
  "TraceAnalyticsAlert",
];

export class DataDogMonitorPropsBuilder extends Component {
  public constructor(project: Cdk8sTypeScriptApp) {
    super(project);
    const filteredMonitorTypes = Object.fromEntries(
      Object.entries(monitorTypes).filter(([key, _]) =>
        supportedMonitorTypes.includes(key),
      ),
    );

    const monitorTypesBase = "Types.generated";
    // Generate a type for each monitorType into Types.generated.ts
    // combining literals into unions to express only a certain set of known values is accepted for "DatadogMonitor.type"
    generateTypeLiteralUnion(project, monitorTypesBase, filteredMonitorTypes);

    const struct = new ProjenStruct(project, {
      name: "DatadogMonitorProps",
      description: "DatadogMonitorProps",
      importLocations: {
        // reference generated Literal Union Type
        types: `./${monitorTypesBase}`,
      },
      filePath: path.join(
        project.srcdir,
        outputDir,
        "DatadogMonitorProps.generated.ts",
      ),
    });

    struct
      .mixin(Struct.fromFqn("@vincentgna/cdk8s-datadog.DatadogMonitorSpec"))
      .withoutDeprecated()
      // replace "string" with "string Literal union" of supported Monitor Types
      .update("type", {
        type: {
          union: {
            types: Object.keys(filteredMonitorTypes).map((s) => ({
              fqn: `types.${s}Type`,
            })),
          },
        },
        optional: false,
        immutable: true,
      })
      .update("query", {
        optional: false,
      });
  }
}

/**
 * Create a Typescript source file with a string literal type for each monitorType
 */
function generateTypeLiteralUnion(
  project: Cdk8sTypeScriptApp,
  monitorTypesBase: string,
  filteredMonitorTypes: { [k: string]: string },
) {
  const monitorTypesSrc = new TextFile(
    project,
    path.join(project.srcdir, outputDir, `${monitorTypesBase}.ts`),
  );
  // Add projen marker
  monitorTypesSrc.addLine(`// ${monitorTypesSrc.marker}`);
  // Create Type for each monitorType
  Object.entries(filteredMonitorTypes).forEach(
    ([monitorType, stringLiteral]) => {
      monitorTypesSrc.addLine(
        `export type ${monitorType}Type = "${stringLiteral}";`,
      );
    },
  );
}
