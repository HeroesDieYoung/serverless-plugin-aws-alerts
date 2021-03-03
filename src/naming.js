const _ = require('lodash');

const getNormalisedName = (name) =>
  `${_.upperFirst(name.replace(/-/g, 'Dash').replace(/_/g, 'Underscore'))}`.substring(0, 255);

class Naming {
  constructor(awsProvider) {
    this.awsProvider = awsProvider;
    this.providerNaming = awsProvider.naming;
  }
  getAlarmCloudFormationRef(alarmName, prefix, method) {
    const normalizePrefix = getNormalisedName(prefix);
    const normalizedName = getNormalisedName(alarmName);
    const normalizedMethod = method ? getNormalisedName(method) : '';

    return `${normalizePrefix}${normalizedName}${normalizedMethod}Alarm`;
  }

  getLogMetricCloudFormationRef(normalizedName, alarmName) {
    return `${normalizedName}${_.upperFirst(alarmName)}LogMetricFilter`;
  }

  getPatternMetricName(metricName, functionName) {
    return `${_.upperFirst(metricName)}${functionName}`;
  }

  getDimensionsList(namespace, dimensionsList, funcRef, omitDefaultDimension, httpEvent) {
    if (omitDefaultDimension) {
      return dimensionsList || [];
    }

    let filteredDimensions;
    if (namespace === 'AWS/ApiGateway') {
      filteredDimensions = (dimensionsList || [])
        .filter((dim) =>
          dim.Name !== 'ApiName' &&
          dim.Name !== 'Resource' &&
          dim.Name !== 'Stage' &&
          dim.Name !== 'Method'
        );

      const apiNameDimension = {
        Name: 'ApiName',
        Value: this.providerNaming.getApiGatewayName()
      };
      filteredDimensions.push(apiNameDimension);

      const resourceDimension = {
        Name: 'Resource',
        Value: `/${httpEvent.http.path}`
      };
      filteredDimensions.push(resourceDimension);

      const stageDimension = {
        Name: 'Stage',
        Value: this.awsProvider.getStage()
      };
      filteredDimensions.push(stageDimension);

      const methodDimension = {
        Name: 'Method',
        Value: httpEvent.http.method
      };
      filteredDimensions.push(methodDimension);

    } else {
      const funcNameDimension = {
        Name: 'FunctionName',
        Value: {
          Ref: funcRef,
        },
      };

      filteredDimensions = (dimensionsList || []).filter(
        (dim) => dim.Name !== 'FunctionName'
      );
      filteredDimensions.push(funcNameDimension);
    }
    return filteredDimensions;
  }

  getAlarmName(options) {
    const interpolatedTemplate = options.template
      .replace('$[functionName]', options.functionName)
      .replace('$[functionId]', options.functionLogicalId)
      .replace('$[metricName]', options.metricName)
      .replace('$[metricId]', options.metricId);

    const prefixTemplate =
      typeof options.prefixTemplate !== 'undefined'
        ? options.prefixTemplate
        : '$[stackName]';
    const interpolatedPrefix = prefixTemplate.replace(
      '$[stackName]',
      options.stackName
    );

    return interpolatedPrefix
      ? `${interpolatedPrefix}-${interpolatedTemplate}`
      : interpolatedTemplate;
  }
}

module.exports = Naming;
