import React, { Component } from "react";
import { connect } from "react-redux";
import LayoutPage from "./LayoutPage";
import {
  requestDownloadDatasetModel,
} from "../actions";
import { 
  getBeforeLastPath,
  getLastPath,
} from "../utils";
import { Select, Col, Row, Table } from 'antd';
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

const {
  SERVER_HOST,
  SERVER_PORT,
} = require('../constants');
const { Option } = Select;

class DatasetPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      csvData: [],
      headers: [],
      selectedFeature: '',
      chartData: [],
    };
    this.fileInputRef = React.createRef();
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    const modelId = getBeforeLastPath(2);
    const datasetType = getLastPath();
    fetch(`http://${SERVER_HOST}:${SERVER_PORT}/api/models/${modelId}/datasets/${datasetType}/view`)
      .then(response => response.text())
      .then(data => {
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          delimiter: ';',
          complete: (results) => {
            const csvData = results.data;
            const headers = Object.keys(csvData[0]);
            this.setState({
              csvData: csvData,
              headers: headers,
            });
          },
          error: () => {
            console.log('Error parsing CSV file');
          },
        });
      });
  }

  handleSelectChange(value) {
    this.setState({ selectedFeature: value });
    const chartData = this.getChartData(value);
    this.setState({ chartData: chartData });
  }

  getChartData(feature) {
    const { csvData } = this.state;
    let chartData = [];

    if (csvData.length > 0) {
      chartData = csvData.map(row => ({ value: parseFloat(row[feature]) }));
      //console.log(JSON.stringify(chartData));
    }
    return chartData;
  }

  render() {
    const modelId = getBeforeLastPath(2);
    const datasetType = getLastPath();
    const { csvData, headers, selectedFeature, chartData } = this.state;
    //const displayedCsvData = csvData.slice(0, 100);

    const columns = csvData.length > 0 ? Object.keys(csvData[0]).map(key => ({
      title: key,
      dataIndex: key,
      sorter: (a, b) => {
        if (typeof a[key] === 'number' && typeof b[key] === 'number') {
          return a[key] - b[key];
        } else {
          return a[key].localeCompare(b[key]);
        }
      },
    })) : [];

    const values = chartData.map((d) => d.value);
    const histogramData = values.reduce((acc, value) => {
      const bin = acc.find((bin) => bin.x0 === value || (bin.x0 < value && value < bin.x1));
      if (bin) {
        bin.count += 1;
      } else {
        acc.push({ x0: value, x1: value + 1, count: 1 });
      }
      return acc;
    }, []);
    console.log(JSON.stringify(histogramData));

    return (
      <LayoutPage pageTitle="Dataset" 
        pageSubTitle={`${datasetType.charAt(0).toUpperCase() + datasetType.slice(1)}ing dataset of the model ${modelId}`}>
        {/* TODO: Fix "ResizeObserver loop limit exceeded", fixed header ? */}
        <div style={{ maxWidth: '100vw', overflowX: 'auto', /* overflowY: 'auto', */ height: 500 }}>
          <Table columns={columns} 
            dataSource={csvData} 
            size="small" bordered
            scroll={{ x: 'max-content', /* y: 400 */ }}
            pagination={{ pageSize: 50 }}
          />
        </div>

        <Row gutter={24}>
          <Col className="gutter-row" span={12}>
            {headers.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {/* <span style={{ marginRight: '0.5rem' }}>Select feature:</span> */}
                <Select /* value={selectedFeature} */ /* style={{ width: 'fit-content' }} */
                  showSearch
                  /* showSearch={false} */
                  placeholder="Select a feature"
                  onChange={this.handleSelectChange}
                  optionFilterProp="children"
                  filterOption={(input, option) => (option?.value ?? '').includes(input)}
                  style={{ width: 200 }}
                >
                  {headers.map((header) => (
                    <Option key={header} value={header}>
                      {header}
                    </Option>
                  ))}
                </Select>
                <h2>Histogram feature {selectedFeature}</h2> 
                <div style={{ width: "100%", height: 400 }}>
                  <BarChart width={800} height={300} data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x0" />
                    <YAxis type="number" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" barSize={30} />
                  </BarChart>
                </div>
              </div>
            )}
          </Col>
        </Row>

        {/* Another way to display csv in (more static) table format  */}
        {/* <div>
          {displayedCsvData.length > 0 && (
            <div style={{ overflow: 'auto', width: '100%' }}>
              <table style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th style={{ border: '1px solid black' }} 
                        key={header}>{header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedCsvData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {headers.map((header, colIndex) => (
                        <td key={`${rowIndex}-${colIndex}`} 
                          style={{ border: '1px solid black' }}>
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div> */}
      </LayoutPage>
    );
  }
}

export default DatasetPage;
