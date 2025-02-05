import React, { Component } from 'react';
import { connect } from "react-redux";
import LayoutPage from './LayoutPage';
import { getLastPath } from "../utils";
import { Menu, Select, Divider, Form, Slider, Switch, Table, Col, Row, Button, Tooltip } from 'antd';
import { QuestionOutlined, CameraOutlined } from "@ant-design/icons";
import { Line, Heatmap, Column, G2 } from '@ant-design/plots';
import {
  requestModel,
  requestMetricCurrentness,
  requestRetrainModel,
  requestRetrainStatus,
} from "../actions";
import {
  SERVER_URL,
} from "../constants";

const { SubMenu } = Menu;
const style = {
  //background: '#0092ff',
  padding: '10px 0',
  border: '1px solid black',
};

const layout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 16,
  },
};

const selectAttacksOptions = 
  [
    {
      value: 'gan',
      label: 'GAN-driven data poisoning',
    },
    {
      value: 'rsl',
      label: 'Random swapping labels',
    },
    {
      value: 'tlf',
      label: 'Target labels flipping',
    },
  ];

class ResilienceMetricsPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      stats: [],
      predictions: [],
      confusionMatrix: [],
      classificationData: [],
      cutoffProb: 0.5,
      cutoffPercentile: 0.5,
      fprs: [], 
      tprs: [], 
      auc: 0,
      dataPrecision: null,
      selectedAttack: null,
      buildConfig: null,
      modelDatasets: [],
      attacksDatasets: [],
      attacksPredictions: [],
      attacksConfusionMatrix: null,
      isRunning: props.retrainStatus.isRunning,
    }
  }

  componentDidMount() {
    let modelId = getLastPath();
    this.props.fetchModel(modelId);
    this.loadPredictions();
    this.props.fetchMetricCurrentness(modelId);
    this.fetchModelBuildConfig();
  }

  // TODO: fix why classification plot and CM are rendered even values are not changed
  /*shouldComponentUpdate(nextProps, nextState) {
    return (
      this.state.classificationData !== nextState.classificationData ||
      this.props.retrainStatus.isRunning !== nextProps.retrainStatus.isRunning ||
      this.state.confusionMatrix !== nextState.confusionMatrix
    );
  }*/

  calculateImpact() {
    const { confusionMatrix, attacksConfusionMatrix } = this.state;
    let impact = 0;
    if (confusionMatrix && attacksConfusionMatrix) {
      const errors = confusionMatrix[0][1] + confusionMatrix[1][0];
      const errorsAttack = attacksConfusionMatrix[0][1] + attacksConfusionMatrix[1][0];
      console.log(errors);
      console.log(errorsAttack);
      impact = (errorsAttack - errors) / errors;
    }
    return impact;
  }

  async componentDidUpdate(prevProps, prevState) {
    const modelId = getLastPath();

    if (prevProps.retrainStatus.isRunning !== this.props.retrainStatus.isRunning) {
      console.log('isRunning has been changed');
      this.setState({ isRunning: this.props.retrainStatus.isRunning });
      if (!this.props.retrainStatus.isRunning) {
        console.log('isRunning changed from True to False');
        const retrainId = this.props.retrainStatus.lastRetrainId;
        await this.loadAttacksPredictions(retrainId);  
      }
    }

    // Check if attacksPredictions state is updated and clear the interval if it is
    if (prevState.attacksConfusionMatrix !== this.state.attacksConfusionMatrix) {
      clearInterval(this.intervalId);
    }
  }

  async loadAttacksPredictions(modelId) {
    const predictionsResponse = await fetch(`${SERVER_URL}/api/models/${modelId}/predictions`, {
      method: 'GET',
    });
    const predictionsData = await predictionsResponse.json();
    const predictionsValues = predictionsData.predictions;
    //console.log(predictionsData);
    const predictions = predictionsValues.split('\n').map((d) => ({
      prediction: parseFloat(d.split(',')[0]),
      trueLabel: parseInt(d.split(',')[1]),
    }));
    //console.log(predictions);
    this.setState({ attacksPredictions: predictions });
    this.updateAttacksConfusionMatrix();
  }

  updateAttacksConfusionMatrix() {
    const { attacksPredictions } = this.state;
    const cutoffProb = 0.5;
    const TP = attacksPredictions.filter((d) => d.trueLabel === 1 && d.prediction >= cutoffProb).length;
    const FP = attacksPredictions.filter((d) => d.trueLabel === 0 && d.prediction >= cutoffProb).length;
    const TN = attacksPredictions.filter((d) => d.trueLabel === 0 && d.prediction < cutoffProb).length;
    const FN = attacksPredictions.filter((d) => d.trueLabel === 1 && d.prediction < cutoffProb).length;
    const confusionMatrix = [
      [TP, FP],
      [FN, TN],
    ];

    this.setState({ attacksConfusionMatrix: confusionMatrix });
  }

  updateConfusionMatrix() {
    const { predictions, cutoffProb } = this.state;
    const TP = predictions.filter((d) => d.trueLabel === 1 && d.prediction >= cutoffProb).length;
    const FP = predictions.filter((d) => d.trueLabel === 0 && d.prediction >= cutoffProb).length;
    const TN = predictions.filter((d) => d.trueLabel === 0 && d.prediction < cutoffProb).length;
    const FN = predictions.filter((d) => d.trueLabel === 1 && d.prediction < cutoffProb).length;
    const confusionMatrix = [
      [TP, FP],
      [FN, TN],
    ];

    this.setState({ confusionMatrix });

    const accuracy = (TP + TN) / (TP + TN + FP + FN);
    const precision = TP / (TP + FP);
    const recall = TP / (TP + FN);
    const f1Score = (2 * precision * recall) / (precision + recall);

    const precisionPositive = TP / (TP + FP);
    const recallPositive = TP / (TP + FN);
    const f1ScorePositive = (2 * precisionPositive * recallPositive) / (precisionPositive + recallPositive);
    const supportPositive = TP + FN;

    const precisionNegative = TN / (TN + FN);
    const recallNegative = TN / (TN + FP);
    const f1ScoreNegative = (2 * precisionNegative * recallNegative) / (precisionNegative + recallNegative);
    const supportNegative = TN + FP;

    //console.log({accuracy, precision, recall, f1Score});
    //console.log({precisionPositive, recallPositive, f1ScorePositive, supportPositive});
    //console.log({precisionNegative, recallNegative, f1ScoreNegative, supportNegative});

    const stats = [
      [precisionPositive, recallPositive, f1ScorePositive, supportPositive],
      [precisionNegative, recallNegative, f1ScoreNegative, supportNegative],
      [accuracy],
    ];

    this.setState({ stats: stats });

    const classificationData = [
      {
        "cutoffProb": "Below cutoff",
        "class": "Normal traffic",
        "value": TN
      },
      {
        "cutoffProb": "Below cutoff",
        "class": "Malware traffic",
        "value": FP
      },
      {
        "cutoffProb": "Above cutoff",
        "class": "Normal traffic",
        "value": FN
      },
      {
        "cutoffProb": "Above cutoff",
        "class": "Malware traffic",
        "value": TP
      },
      {
        "cutoffProb": "Total",
        "class": "Normal traffic",
        "value": (TN + FN)
      },
      {
        "cutoffProb": "Total",
        "class": "Malware traffic",
        "value": (TP + FP)
      },
    ];    

    this.setState({ classificationData: classificationData });
  }

  async loadPredictions() {
    const modelId = getLastPath();

    const predictionsResponse = await fetch(`${SERVER_URL}/api/models/${modelId}/predictions`, {
      method: 'GET',
    });
    const predictionsData = await predictionsResponse.json();
    const predictionsValues = predictionsData.predictions;
    //console.log(predictionsData);
    const predictions = predictionsValues.split('\n').map((d) => ({
      prediction: parseFloat(d.split(',')[0]),
      trueLabel: parseInt(d.split(',')[1]),
    }));
    //console.log(predictions);
    this.setState({ predictions }, this.updateConfusionMatrix);
  }

  fetchModelBuildConfig = async () => {
    const modelId = getLastPath();
    try {
      const response = await fetch(`${SERVER_URL}/api/models/${modelId}/build-config`);
      const data = await response.json();
      const buildConfig = JSON.parse(data.buildConfig);
      this.setState({ buildConfig: buildConfig });
      console.log(buildConfig.training_parameters);
    } catch (error) {
      console.error('Error fetching build-config:', error);
    }
  };

  handleSelectedAttack(selectedAttack) {
    let modelId = getLastPath();
    this.setState({ selectedAttack: selectedAttack });
    
    const { isRunning, buildConfig, modelDatasets, attacksDatasets } = this.state;
    const trainingParameters = buildConfig.training_parameters;
    const testingDataset = "Test_samples.csv";
    const trainingDataset = `${selectedAttack}_poisoned_dataset.csv`;

    if (!isRunning) {
      console.log("update isRunning state!");
      this.setState({ isRunning: true });
      this.props.fetchRetrainModel(
        modelId, trainingDataset, testingDataset, trainingParameters,
      );
      this.intervalId = setInterval(() => { // start interval when button is clicked
        this.props.fetchRetrainStatus();
      }, 5000);
    }
  }

  render() {
    const {
      model,
      metrics,
      retrainStatus,
    } = this.props;
    console.log(retrainStatus);
    let modelId = getLastPath();

    const { 
      cutoffProb,
      cutoffPercentile,
      predictions,
      attacksPredictions,
      confusionMatrix,
      stats,
      classificationData,
      fprs, tprs, auc, rocData,
      dataPrecision,
      selectedAttack,
      attacksConfusionMatrix,
      isRunning,
    } = this.state;

    const statsStr = stats.map((row, i) => `${i},${row.join(',')}`).join('\n');
    const rowsStats = statsStr.split('\n').map(row => row.split(','));
    const headerStats = ["precision", "recall", "f1score", "support"];
    let dataStats = [];
    if(rowsStats.length == 3) {
      const accuracy = parseFloat(rowsStats[2][1]);
      dataStats = headerStats.map((metric, i) => ({
        key: (i).toString(),
        metric,
        class0: +rowsStats[0][i+1],
        class1: +rowsStats[1][i+1],
      }));
      dataStats.push({
        key: '5',
        metric: 'accuracy',
        class0: accuracy,
        class1: accuracy,
      });
    }

    const cmStr = confusionMatrix.map((row, i) => `${i},${row.join(',')}`).join('\n');
    const headers = ["Normal traffic", "Malware traffic"];
    const rows = cmStr.trim().split('\n');
    const data = rows.flatMap((row, i) => {
      const cols = row.split(',');
      const rowTotal = cols.slice(1).reduce((acc, val) => acc + Number(val), 0);
      return cols.slice(1).map((val, j) => ({
        actual: headers[i],
        predicted: headers[j],
        count: Number(val),
        percentage: `${((Number(val) / rowTotal) * 100).toFixed(2)}%`,
      }));
    });

    const configCM = {
      data: data,
      forceFit: true,
      xField: 'predicted',
      yField: 'actual',
      colorField: 'count',
      shape: 'square',
      tooltip: false,
      xAxis: { title: { style: { fontSize: 20 }, text: 'Predicted', } },
      yAxis: { title: { style: { fontSize: 20 }, text: 'Observed', } },
      label: {
        visible: true,
        position: 'middle',
        style: {
          fontSize: '18',
        },
        formatter: (datum) => {
          return `${datum.count}\n(${datum.percentage})`;
        },
      },
      heatmapStyle: {
        padding: 0,  
        stroke: '#fff',
        lineWidth: 1,
      },
    };

    let configAttacksCM = null;
    if (attacksConfusionMatrix) {
      const cmStrAtt = attacksConfusionMatrix.map((row, i) => `${i},${row.join(',')}`).join('\n');
      const rowsAtt = cmStrAtt.trim().split('\n');
      const dataAtt = rowsAtt.flatMap((row, i) => {
        const colsAtt = row.split(',');
        const rowTotalAtt = colsAtt.slice(1).reduce((acc, val) => acc + Number(val), 0);
        return colsAtt.slice(1).map((val, j) => ({
          actual: headers[i],
          predicted: headers[j],
          count: Number(val),
          percentage: `${((Number(val) / rowTotalAtt) * 100).toFixed(2)}%`,
        }));
      });
      console.log(dataAtt);
      configAttacksCM = {
        data: dataAtt,
        forceFit: true,
        xField: 'predicted',
        yField: 'actual',
        colorField: 'count',
        shape: 'square',
        tooltip: false,
        xAxis: { title: { style: { fontSize: 20 }, text: 'Predicted', } },
        yAxis: { title: { style: { fontSize: 20 }, text: 'Observed', } },
        label: {
          visible: true,
          position: 'middle',
          style: {
            fontSize: '18',
          },
          formatter: (datum) => {
            return `${datum.count}\n(${datum.percentage})`;
          },
        },
        heatmapStyle: {
          padding: 0,  
          stroke: '#fff',
          lineWidth: 1,
        },
      };
    }

    const impact = this.calculateImpact();
    console.log(impact);

    const items = [ 
      {
        label: 'Impact Metric',
        key: 'impact',
        link: "#impact",
      },
    ];

    return (
      <LayoutPage pageTitle="Resilience Metrics" pageSubTitle={`Model ${modelId}`}>
        <Menu mode="horizontal" style={{ backgroundColor: 'transparent', fontSize: '16px' }}>
          {items.map(item => (
            <Menu.Item key={item.key}>
              <a href={item.link}><strong>{item.label}</strong></a>
            </Menu.Item>
          ))}
        </Menu>

        <Row gutter={24} style={{ marginTop: '20px' }}>
          <Col className="gutter-row" span={24} id="impact">
            <div style={style}>
              <h2>&nbsp;&nbsp;&nbsp;Impact Metric</h2>
              &nbsp;&nbsp;&nbsp;
              <Tooltip title="Select an adversarial attack to be performed against the model.">
                <Select
                  style={{
                    width: '100%',
                  }}
                  allowClear
                  placeholder="Select an attack ..."
                  onChange={value => {
                    if (value) { // TODO: this function is auto executed even users have not selected an attack yet
                      this.handleSelectedAttack(value);
                    }
                  }}
                  optionLabelProp="label"
                  options={selectAttacksOptions}
                  style={{ width: 300, marginTop: '10px', marginBottom: '20px' }}
                />
              </Tooltip>
              { attacksConfusionMatrix &&
                <h3>&nbsp;&nbsp;&nbsp;Score: {impact}</h3>
              }
              <Row gutter={24} style={{height: '400px'}}>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <Tooltip title="Impact metric shows difference between the original accuracy of a benign model compared to the accuracy of the compromised model after a successful poisoning attack.">
                    <Button type="link" icon={<QuestionOutlined />} />
                  </Tooltip>
                </div>
                <Col className="gutter-row" span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flex: 1, flexWrap: 'wrap', marginTop: '20px' }}>
                    <div style={{ position: 'relative', height: '320px', width: '100%', maxWidth: '390px' }}>
                    <h3> Model before attack </h3>
                    { attacksConfusionMatrix &&
                      <Heatmap {...configCM} />
                    }
                    </div>
                  </div>
                </Col>
                <Col className="gutter-row" span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flex: 1, flexWrap: 'wrap', marginTop: '20px' }}>
                    <div style={{ position: 'relative', height: '320px', width: '100%', maxWidth: '390px' }}>
                      <h3> Model after attack </h3>
                      { attacksConfusionMatrix &&
                        <Heatmap {...configAttacksCM} />
                      }
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </LayoutPage>
    );
  }
}

const mapPropsToStates = ({ model, metrics, retrainStatus }) => ({
  model, metrics, retrainStatus,
});

const mapDispatchToProps = (dispatch) => ({
  fetchRetrainStatus: () => dispatch(requestRetrainStatus()),
  fetchModel: (modelId) => dispatch(requestModel(modelId)),
  fetchMetricCurrentness: (modelId) => dispatch(requestMetricCurrentness(modelId)),
  fetchRetrainModel: (modelId, trainingDataset, testingDataset, params) =>
    dispatch(requestRetrainModel({ modelId, trainingDataset, testingDataset, params })),
});

export default connect(mapPropsToStates, mapDispatchToProps)(ResilienceMetricsPage);