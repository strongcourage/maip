import React, { Component } from "react";
import { connect } from "react-redux";
import { Table, Space, Button, Select } from "antd";
import { Link } from 'react-router-dom';
import LayoutPage from "./LayoutPage";
import Papa from "papaparse";
import { 
  FolderViewOutlined, DownloadOutlined, FileOutlined, TableOutlined, 
  LineChartOutlined, SolutionOutlined, BugOutlined,
  HourglassOutlined, RestOutlined, QuestionOutlined,
} from '@ant-design/icons';
import {
  requestAllModels,
  deleteModel,
  requestDownloadModel,
} from "../actions";
import moment from "moment";
const {
  SERVER_HOST,
  SERVER_PORT,
} = require('../constants');

const { Option } = Select;

class ModelListPage extends Component {
  componentDidMount() {
    this.props.fetchAllModels();
  }

  async handleDownloadDataset(modelId, datasetType) {
    try {
      const res = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/api/models/${modelId}/datasets/${datasetType}/download`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const datasetFileName = `${modelId}_${datasetType.charAt(0).toUpperCase() + datasetType.slice(1)}_samples.csv`;
      link.setAttribute('download', datasetFileName);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading dataset:', error);
    }
  }

  handleDeleteModel = (modelId) => {
    fetch(`http://${SERVER_HOST}:${SERVER_PORT}/api/models/${modelId}/`, {
      method: 'DELETE'
    })
      .then(() => {
        this.props.fetchAllModels();
      })
      .catch((error) => {
        console.log(error);
      });
  };
  
  render() {
    const { models, fetchDeleteModel } = this.props;
    console.log(models);

    if (!models) {
      console.error("No models")
      return null;
    }

    const handleOptionClick = (option) => {
      if (option.url) {
        window.location.href = option.url;
      } else if (option.onClick) {
        option.onClick();
      }
    };    

    const dataSource = models.map((model, index) => ({ ...model, key: index }));
    const columns = [
      {
        title: "Model Id",
        key: "data",
        width: '25%',
        render: (model) => (
          <div>
            <a href={`/models/${model.modelId}`}>
              {model.modelId}
            </a>
          </div>
        ),
      },
      {
        title: "Built At",
        key: "data",
        sorter: (a, b) => a.lastBuildAt - b.lastBuildAt,
        render: (model) => {
          console.log(model.lastBuildAt);
          return moment(model.lastBuildAt).format("MMMM Do YYYY, h:mm:ss a");
        },
        width: '20%', /* width: 300, */
      },
      {
        title: "Training Dataset",
        key: "data",
        width: '20%',
        render: (model) => (
          <div>
            <a href={`/datasets/${model.modelId}/train`} view>
              <Space wrap>
                <Button icon={<FolderViewOutlined />}>View</Button>
              </Space>
            </a>
            &nbsp;&nbsp;
            <Space wrap>
              <Button icon={<DownloadOutlined />} 
                onClick={() => this.handleDownloadDataset(model.modelId, "train")}
              >Download</Button>
            </Space>
          </div>
        ),
      },
      {
        title: "Testing Dataset",
        key: "data",
        width: '20%',
        render: (model) => (
          <div>
            <a href={`/datasets/${model.modelId}/test`} view>
                <Space wrap>
                  <Button icon={<FolderViewOutlined />}>View</Button>
                </Space>
              </a>
              &nbsp;&nbsp;
              <Space wrap>
                <Button icon={<DownloadOutlined />} 
                  onClick={() => this.handleDownloadDataset(model.modelId, "test")}
                >Download</Button>
            </Space>
          </div>
        ),
      },
      {
        title: "Actions",
        key: "data",
        width: '15%',
        render: (model) => {
          const options = [
            {
              label: 'Retrain',
              icon: <HourglassOutlined />,
              url: `/retrain/${model.modelId}`
            },
            {
              label: 'Predict',
              icon: <LineChartOutlined />,
              url: `/predict/${model.modelId}`
            },
            {
              label: 'XAI',
              icon: <SolutionOutlined />,
              url: `/xai/${model.modelId}`
            },
            {
              label: 'Attacks',
              icon: <BugOutlined />,
              url: `/attacks/${model.modelId}`
            },
            {
              label: 'Delete',
              icon: <RestOutlined />,
              onClick: () => this.handleDeleteModel(model.modelId)
            }
          ];
          return (
            <Select placeholder="Select an action"
              style={{ width: 200 }}
              options={options.map(option => ({
                value: option.url || "",
                label: (
                  <Space wrap>
                    {option.icon}
                    {option.label}
                  </Space>
                ),
                onClick: option.onClick,
              }))} 
              onChange={(value, option) => handleOptionClick(option)}
            />
          );
        },
      },
    ];
        
    return (
      <LayoutPage pageTitle="Models" pageSubTitle="All the models">
        <a href={`/build`}>
          <Space wrap>
            <Button style={{ marginBottom: '16px' }}>
              Add a new model
            </Button>
          </Space>
        </a>
        <Table columns={columns} dataSource={dataSource}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (model) => 
              <p style={{ margin: 0 }}>
                <h3><b>Build config:</b></h3>
                <pre style={{ fontSize: "12px" }}>
                  {JSON.stringify(model.buildConfig, null, 2)}
                </pre>
              </p>,
          }}
        />
      </LayoutPage>
    );
  }
}

const mapPropsToStates = ({ models }) => ({
  models
});

const mapDispatchToProps = (dispatch) => ({
  fetchAllModels: () => dispatch(requestAllModels()),
  //fetchDeleteModel: (modelId) => dispatch(deleteModel(modelId)),
});

export default connect(mapPropsToStates, mapDispatchToProps)(ModelListPage);
