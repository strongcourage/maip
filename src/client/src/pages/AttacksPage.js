import React, { Component } from "react";
import { connect } from "react-redux";
import LayoutPage from "./LayoutPage";
import {
  requestPerformAttack,
  requestAttacksStatus,
} from "../actions";
import { 
  getBeforeLastPath,
  getLastPath,
} from "../utils";
import Papa from "papaparse";
import { Column, G2, Heatmap, Bar, Scatter, Histogram, Mix } from '@ant-design/plots';
import { message, Table, Col, Row, Divider, Slider, Form, Button, Checkbox, Select, Tooltip } from 'antd';
import { QuestionOutlined, DownloadOutlined, BugOutlined, CameraOutlined } from "@ant-design/icons";

const layout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 16,
  },
};
const style = {
  padding: '10px 0',
  border: '1px solid black',
};
const {
  SERVER_URL,
  FEATURES_DESCRIPTIONS,
} = require('../constants');
const { Option } = Select;

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

// TODO: users must select only 1 option in TLF attack

class AttacksPage extends Component {

  constructor(props) {
    super(props);
    this.state = {
      csvDataOriginal: [],
      csvDataPoisoned: [],
      poisoningRate: 50,
      selectedAttack: null,
      targetClass: null,
      isRunning: props.attacksStatus.isRunning,
    };
    this.handleTargetClass = this.handleTargetClass.bind(this);
  }

  componentDidMount() {
    const modelId = getLastPath();
    const datasetType = "train";
    fetch(`${SERVER_URL}/api/models/${modelId}/datasets/${datasetType}/view`)
    .then(response => response.text())
      .then(data => {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          delimiter: ';',
          complete: (results) => {
            const csvDataOriginal = results.data;
            const headers = Object.keys(csvDataOriginal[0]);
            this.setState({
              csvDataOriginal: csvDataOriginal,
              headers: headers,
            });
          },
          error: () => {
            console.log('Error parsing CSV file');
          },
        });
      });
  }

  handleTargetClass(checkedValues) {
    let targetClass = null;
    if (checkedValues.length === 1) {
      if (checkedValues[0].includes('Malware')) {
        targetClass = 1;
      } else {
        targetClass = 0;
      }
    } else {
      message.warning('Please select only one option.');
      targetClass = null;
    }
    this.setState({ targetClass });
  };

  displayPoisonedDataset(modelId, selectedAttack, poisoningRate, targetClass) {
    fetch(`${SERVER_URL}/api/attacks/poisoning/${selectedAttack}/${modelId}/view`)
      .then(response => response.text())
      .then(data => {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          delimiter: ';',
          complete: (results) => {
            const csvDataPoisoned = results.data;
            const headers = Object.keys(csvDataPoisoned[0]);
            this.setState({
              csvDataPoisoned: csvDataPoisoned,
              headers: headers,
            });
          },
          error: () => {
            console.log('Error parsing CSV file');
          },
        });
      });
  }

  async componentDidUpdate(prevProps, prevState) {
    const modelId = getLastPath();
    const { isRunning, selectedAttack, poisoningRate, targetClass } = this.state;
    const { attacksStatus } = this.props;
    
    if (prevProps.attacksStatus.isRunning !== this.props.attacksStatus.isRunning) {
      console.log('State isRunning has been changed');
      this.setState({ isRunning: this.props.attacksStatus.isRunning });
      if (!this.props.attacksStatus.isRunning) {
        console.log('isRunning changed from True to False');
        this.displayPoisonedDataset(modelId, selectedAttack, poisoningRate, targetClass);
      }
    }

    // Check if csvDataPoisoned state is updated and clear the interval if it is
    if (prevState.csvDataPoisoned !== this.state.csvDataPoisoned) {
      clearInterval(this.intervalId);
    }
  }

  async handlePerformAttackClick(modelId, selectedAttack, poisoningRate, targetClass) {
    const { isRunning } = this.state;
    if (!isRunning) {
      console.log("handlePerformAttackClick update isRunning state!");
      this.setState({ isRunning: true });        
      this.props.fetchPerformAttack(modelId, selectedAttack, poisoningRate, targetClass);
      this.intervalId = setInterval(() => { // start interval when button is clicked
        this.props.fetchAttacksStatus();
      }, 1000);
    }
  }

  render() {
    const modelId = getLastPath();
    const {
      csvDataOriginal,
      csvDataPoisoned,
      poisoningRate, 
      selectedAttack, 
      targetClass,
      isRunning,
    } = this.state;
    const {
      attacksStatus, 
    } = this.props;
    console.log(`Attacks isRunning: ${attacksStatus.isRunning}`);

    const columns = csvDataOriginal.length > 0 ? Object.keys(csvDataOriginal[0]).map(key => ({
      title: key,
      dataIndex: key,
      sorter: (a, b) => {
        const aVal = parseFloat(a[key]);
        const bVal = parseFloat(b[key]);
        if (!isNaN(aVal) && !isNaN(bVal)) {
          return aVal - bVal;
        } else {
          return a[key].localeCompare(b[key]);
        }
      },
    })) : [];
    const labelsDataOriginal = csvDataOriginal.map((row) => row.malware);
    const labelsDataPoisoned = csvDataPoisoned.map((row) => parseInt(row.malware).toString());
    //console.log(labelsDataOriginal);
    //console.log(labelsDataPoisoned);
    const totalSamples = labelsDataOriginal.length;
    const groupedDataOriginal = labelsDataOriginal.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const groupedDataPoisoned = labelsDataPoisoned.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    console.log(groupedDataOriginal);
    console.log(groupedDataPoisoned);

    const dataLabelsColumn = [
      {
        "datasetType": "original",
        "class": "Normal traffic",
        "count": (groupedDataOriginal['0'] || 0),
        "value": ((groupedDataOriginal['0'] || 0) * 100) / totalSamples
      },
      {
        "datasetType": "original",
        "class": "Malware traffic",
        "count": (groupedDataOriginal['1'] || 0),
        "value": ((groupedDataOriginal['1'] || 0) * 100) / totalSamples
      },
      {
        "datasetType": "poisoned",
        "class": "Normal traffic",
        "count": (groupedDataPoisoned['0'] || 0),
        "value": ((groupedDataPoisoned['0'] || 0) * 100) / totalSamples
      },
      {
        "datasetType": "poisoned",
        "class": "Malware traffic",
        "count": (groupedDataPoisoned['1'] || 0),
        "value": ((groupedDataPoisoned['1'] || 0) * 100) / totalSamples
      },
    ];

    G2.registerInteraction('element-link', {
      start: [
        {
          trigger: 'interval:mouseenter',
          action: 'element-link-by-color:link',
        },
      ],
      end: [
        {
          trigger: 'interval:mouseleave',
          action: 'element-link-by-color:unlink',
        },
      ],
    });
    const configLabelsColumn = {
      data: dataLabelsColumn,
      xField: 'datasetType',
      yField: 'value',
      seriesField: 'class',
      isPercent: true,
      isStack: true,
      meta: {
        value: {
          min: 0,
          max: 1,
        },
      },
      label: {
        position: 'middle',
        content: (item) => {
          return `${item.count} (${(item.value * 100).toFixed(2)}%)`;
        },
        style: {
          fill: '#fff',
          fontSize: 16,
        },
      },
      tooltip: false,
      interactions: [
        {
          type: 'element-highlight-by-color',
        },
        {
          type: 'element-link',
        },
      ],
    };

    return (
      <LayoutPage pageTitle="Adversarial Attacks" 
        pageSubTitle={`Adversarial attacks against the model ${modelId}`}>
        
        <Form
        {...layout}
        name="control-hooks"
        style={{
          maxWidth: 700,
        }}
        >
          <Form.Item name="slider" label="Poisoning percentage"
            style={{ marginBottom: 0 }}
          >
            <Slider
              marks={{
                0: '0',
                10: '10',
                20: '20',
                30: '30',
                40: '40',
                50: '50',
                60: '60',
                70: '70',
                80: '80',
                90: '90',
                100: '100',
              }}
              min={0} max={100} defaultValue={poisoningRate}
              value={poisoningRate}
              onChange={value => this.setState({ poisoningRate: value })}
            />
          </Form.Item>

          <Form.Item name="select" label="Adversarial attack" 
            style={{ flex: 'none', marginBottom: 20 }}
          > 
            <Tooltip title="Select an adversarial attack to be performed against the model.">
              <Select
                style={{
                  width: '100%',
                }}
                allowClear
                placeholder="Select an attack ..."
                onChange={value => this.setState({ selectedAttack: value })}
                optionLabelProp="label"
                options={selectAttacksOptions}
              />
            </Tooltip>
          </Form.Item>
          <Form.Item name="checkbox" label="Target class" 
            valuePropName="checked"
            style={{ flex: 'none', marginBottom: 10 }}
          >
            <Checkbox.Group 
              options={['Normal traffic', 'Malware traffic']}
              defaultValue={[]}
              disabled={selectedAttack !== 'tlf'}
              onChange={this.handleTargetClass}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button type="primary" //>icon={<BugOutlined />}
              onClick={() => {
                console.log({ modelId, selectedAttack, poisoningRate, targetClass });
                this.handlePerformAttackClick(modelId, selectedAttack, poisoningRate, targetClass);
              }}
              >Perform Attack
            </Button>
          </div>
        </Form>

        <Divider orientation="left">
          <h1 style={{ fontSize: '24px' }}>Compare Original and Poisoned Training Datasets</h1>
        </Divider>

        {csvDataOriginal.length > 0 && csvDataPoisoned.length > 0 &&
          <Row gutter={24}>
            <Col className="gutter-row" span={12}>
              <div style={style}>          
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <Tooltip title="The plot displays the frequency of output labels before and after an attack, represented as percentages. It provides a visual comparison of the distribution of labels in the original and poisoned training datasets.">
                    <Button type="link" icon={<QuestionOutlined />} />
                  </Tooltip>
                </div>
                <Column {...configLabelsColumn} style={{ margin: '20px' }}/>
              </div>
            </Col>
          </Row>
          
        }
      </LayoutPage>
    );
  }
}

const mapPropsToStates = ({ attacksStatus }) => ({
  attacksStatus,
});

const mapDispatchToProps = (dispatch) => ({
  fetchAttacksStatus: () => dispatch(requestAttacksStatus()),
  fetchPerformAttack: (modelId, selectedAttack, poisoningRate, targetClass) =>
    dispatch(requestPerformAttack({ modelId, selectedAttack, poisoningRate, targetClass })),
});

export default connect(mapPropsToStates, mapDispatchToProps)(AttacksPage);
