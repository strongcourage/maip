import React, { Component } from 'react';
import { connect } from "react-redux";
import LayoutPage from './LayoutPage';
import { getLastPath } from "../utils";
import { Col, Row, Divider, Slider, Form, InputNumber, Button, Checkbox, Select } from 'antd';
import { UserOutlined, DownloadOutlined, QuestionOutlined, CameraOutlined } from "@ant-design/icons";
import { Bar } from '@ant-design/plots';
import {
  requestRunLime,
  requestXAIStatus,
  requestLimeValues,
} from "../actions";

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

let barLime;
let intervalXAI;

const downloadLimeImage = () => { barLime?.downloadImage(); };
//const toDataURL = () => { console.log(barLime?.toDataURL()); };

const onFinish = (values) => {
  console.log(values);
};

const onChange = (values) => {
  console.log(values);
};

class XAIPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sampleId: 20,
      numberSamples: 10,
      maxDisplay: 30,
      positiveChecked: true,
      negativeChecked: true,
      maskedFeatures: [],
    };
    this.handleRandomClick = this.handleRandomClick.bind(this);
    this.handleContributionsChange = this.handleContributionsChange.bind(this);
    this.handleMaskedFeatures = this.handleMaskedFeatures.bind(this);
  }

  onSliderChange(newVal) {
    this.setState({ maxDisplay: newVal });
  }
  
  onSampleIdChange(newId) {
    this.setState({ sampleId: newId });
  }

  onNumberSamplesChange(newVal) {
    this.setState({ numberSamples: newVal });
  }

  handleRandomClick() {
    const randomVal = Math.floor(Math.random() * 100);
    console.log(randomVal.toString());
    this.setState({ sampleId: randomVal });
  };

  handleContributionsChange(checkedValues){
    const positiveChecked = checkedValues.includes('Positive');
    const negativeChecked = checkedValues.includes('Negative');
    this.setState({ positiveChecked, negativeChecked });
  };

  handleMaskedFeatures(values){
    console.log(`Masked features ${values}`);
    this.setState({ maskedFeatures: values });
  };

  componentDidMount() {
    let modelId = getLastPath();
    console.log(modelId);
    this.props.fetchLimeValues(modelId);
    this.props.fetchXAIStatus();
    /* this.xaiStatusTimer = setInterval(() => {
      this.props.fetchXAIStatus();
    }, 3000); */
  }

  componentWillUnmount() {
    clearInterval(this.xaiStatusTimer);
  }

  render() {
    const modelId = getLastPath();
    const { 
      sampleId,
      numberSamples,
      maxDisplay, 
      positiveChecked,
      negativeChecked,
      maskedFeatures,
    } = this.state;
    const { 
      limeValues,
      xaiStatus, 
    } = this.props;
    console.log(xaiStatus);

    const features = limeValues.map(obj => obj.feature).sort();
    console.log(features);
    const selectFeaturesOptions = features.map((label, index) => ({
      value: label, label,
    }));

    /* TODO: wait for the XAI method process finishes and auto display new plots? */
    if (!xaiStatus.isRunning) {
      //clearInterval(intervalXAI);
      //setInterval(null);
      const sortedValuesLime = limeValues.slice().sort((a, b) => b.value - a.value);
      const notZeroSortedValuesLime = sortedValuesLime.filter(d => d.value !== 0);
      const filteredValuesLime = notZeroSortedValuesLime.filter((d) => {
        if (d.value > 0 && positiveChecked) return true;
        if (d.value < 0 && negativeChecked) return true;
        return false;
      });

      const filteredMaskedValuesLime = filteredValuesLime.filter(obj => 
        !maskedFeatures.some(feature => obj.feature.includes(feature)));
      //console.log(filteredMaskedValuesLime);

      const limeValuesBarConfig = {
        data: filteredMaskedValuesLime.slice(0, maxDisplay),
        isStack: true,
        xField: 'value',
        yField: 'feature',
        //seriesField: "value",
        label: false,
        barStyle: (d) => {
          //console.log(d)
          return {
            /* https://casesandberg.github.io/react-color/ */
            fill: d.value > 0 ? "#0693e3" : "#EB144C"
          };
        },
        /* TODO: add title of Bar chart */
        /* barTitle: {
          text: "My Bar Chart Title",
          style: { fontSize: 16 }
        }, */
        meta: {
          value: {
            min: Math.min(...filteredMaskedValuesLime.map((d) => d.value)),
            max: Math.max(...filteredMaskedValuesLime.map((d) => d.value))
          }
        },
        geometry: 'interval',
        interactions: [{ type: 'zoom' }],
      };

      return (
        <LayoutPage pageTitle="XAI Page" pageSubTitle={`Model ${modelId}`}>
          <Divider orientation="left"><h3>Parameters</h3></Divider>
          <Form
          {...layout}
          name="control-hooks"
          onFinish={onFinish}
          style={{
            maxWidth: 600,
          }}
          >
            <Form.Item label="Sample ID" style={{ marginBottom: 10 }}>
              <div style={{ display: 'inline-flex' }}>
                <Form.Item label="id" name="id" noStyle>
                  <InputNumber min={1} defaultValue={sampleId}
                    onChange={(e) => this.onSampleIdChange(e)}
                  />
                </Form.Item>
              </div>  
            </Form.Item>
            <Form.Item name="slider" label="Features to display" 
              style={{ marginBottom: -5 }}>
              <Slider
                marks={{
                  1: '1',
                  5: '5',
                  10: '10',
                  15: '15',
                  20: '20',
                  25: '25',
                  30: '30',
                }}
                min={1} max={30} defaultValue={maxDisplay}
                value={maxDisplay}
                onChange={(value) => this.onSliderChange(value)}
              />
            </Form.Item>
            <Form.Item name="checkbox" label="Contributions to display" 
              valuePropName="checked"
              style={{ flex: 'none', marginBottom: 10 }}>
              <Checkbox.Group 
                options={['Positive', 'Negative']}
                defaultValue={['Positive', 'Negative']}
                onChange={this.handleContributionsChange} 
              />
            </Form.Item>
            <Form.Item name="select" label="Feature(s) to mask" 
              style={{ flex: 'none', marginBottom: 10 }}>
              <Select
                mode="multiple"
                style={{
                  width: '100%',
                }}
                allowClear
                placeholder="Select ..."
                onChange={this.handleMaskedFeatures}
                optionLabelProp="label"
                options={selectFeaturesOptions}
              />
            </Form.Item>
            <div style={{ textAlign: 'center' }}>
              <Button icon={<UserOutlined />}
                /* style={{ marginLeft: '5px' }} */
                onClick={() => {
                  console.log([modelId, sampleId, numberSamples, maxDisplay]);
                  this.props.fetchRunLime(
                    modelId, sampleId, maxDisplay,
                  );
                }}
                >LIME Explain
              </Button>
            </div>
          </Form>

          <Row gutter={24}>
            <Col className="gutter-row" span={12}>
              <Divider orientation="left"><h3>LIME Explanations</h3></Divider>
              <div style={style}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <h2>&nbsp;&nbsp;&nbsp;Local Explanation - Sample ID {sampleId}</h2>
                  <Button type="button" icon={<CameraOutlined />}
                    style={{ marginRight: '20rem' }}
                    titleDelay={50}
                    title="Download plot as png" 
                    onClick={downloadLimeImage} 
                  />
                  <Button type="button" icon={<QuestionOutlined />}
                    titleDelay={50}
                    title="Local interpretability plot displays each most important feature's contributions for this specific sample."
                  />
                </div>
                {/* <button type="button" onClick={toDataURL}>
                  Get base64
                </button> */}
                &nbsp;&nbsp;&nbsp;
                <Bar {...limeValuesBarConfig} onReady={(bar) => (barLime = bar)}/>
              </div>
            </Col>
          </Row>
        </LayoutPage>
      );
    } else {
      /* intervalXAI = setInterval(() => {
        this.props.fetchXAIStatus();
      }, 10000); */
      return (
        <LayoutPage pageTitle="XAI Page" pageSubTitle={`Model ${modelId}`}>
          <Divider orientation="left"><h3>Parameters</h3></Divider>
          <Form
          {...layout}
          name="control-hooks"
          onFinish={onFinish}
          style={{
            maxWidth: 600,
          }}
          >
            {/* TODO: display value of slider (really need?), space between Slide and Checkbox is large? */}
            <Form.Item name="slider" label="Features to display" style={{ marginBottom: 10 }}>
              <Slider
                marks={{
                  1: '1',
                  5: '5',
                  10: '10',
                  15: '15',
                  20: '20',
                  25: '25',
                  30: '30',
                }}
                min={1} max={30} defaultValue={maxDisplay}
                value={maxDisplay}
                onChange={(value) => this.onSliderChange(value)}
              />
            </Form.Item>
            <Form.Item name="checkbox" label="Contributions to display" style={{ flex: 'none', marginBottom: 10 }}>
              <Checkbox.Group 
                options={['Positive', 'Negative']}
                /* TODO: checked values did not display correctly */
                /* defaultValue={['Positive', 'Negative']} */
                onChange={this.handleContributionsChange} 
              />
            </Form.Item>
          </Form>

          <Row gutter={24}>
            <Col className="gutter-row" span={12}>
              <Divider orientation="left"><h3>LIME Explanations</h3></Divider>
              <Form.Item label="Sample ID" style={{ marginBottom: 10 }}>
                <div style={{ display: 'inline-flex' }}>
                  <Form.Item label="id" name="id" noStyle>
                    <InputNumber min={1} defaultValue={sampleId}
                      onChange={(e) => this.onSampleIdChange(e)}
                    />
                  </Form.Item>
                  <Button icon={<UserOutlined />}
                    style={{ marginLeft: '5px' }}
                    onClick={() => {
                      console.log([modelId, sampleId, numberSamples, maxDisplay]);
                      this.props.fetchRunLime(
                        modelId, sampleId, maxDisplay,
                      );
                    }}
                    >LIME Explain
                  </Button>
                </div>    
              </Form.Item>
            </Col>
          </Row>
        </LayoutPage>
      );
    }
  }
}

const mapPropsToStates = ({ limeValues, xaiStatus }) => ({
  limeValues, xaiStatus,
});

const mapDispatchToProps = (dispatch) => ({
  fetchXAIStatus: () => dispatch(requestXAIStatus()),
  fetchRunLime: (modelId, sampleId, numberFeatures) =>
    dispatch(requestRunLime({ modelId, sampleId, numberFeatures })),
  fetchLimeValues: (modelId) => dispatch(requestLimeValues(modelId)),
});

export default connect(mapPropsToStates, mapDispatchToProps)(XAIPage);