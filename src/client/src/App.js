import React from "react";
import { Layout } from 'antd';
import "antd/dist/reset.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import ErrorBoundary from "antd/lib/alert/ErrorBoundary";
import MAIPHeader from "./components/MAIPHeader";
import MAIPFooter from "./components/MAIPFooter";
import ModelListPage from "./pages/ModelListPage";
import ModelPage from "./pages/ModelPage";
import DatasetListPage from "./pages/DatasetListPage";
import DatasetPage from "./pages/DatasetPage";
import BuildPage from "./pages/BuildPage";
import RetrainPage from "./pages/RetrainPage";
import AttacksPage from "./pages/AttacksPage";
//import DummyPage from "./pages/DummyPage";
import PredictPage from "./pages/PredictPage";
import PredictModelPage from "./pages/PredictModelPage";
import XAIPage from "./pages/XAIPage";
import XAIModelPage from "./pages/XAIModelPage";
import XAITestPage from "./pages/XAITestPage";
import XAILimePage from "./pages/XAILimePage";
import XAIShapPage from "./pages/XAIShapPage";
import MetricsPage from "./pages/MetricsPage";
import AccountabilityMetricsPage from "./pages/AccountabilityMetricsPage";
import ResilienceMetricsPage from "./pages/ResilienceMetricsPage";
//import MetricsTestPage from "./pages/MetricsTestPage";
//import ScatterPage from "./pages/ScatterPage";

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Layout className="layout" style={{ height: "100%" }}>
          <MAIPHeader />
          <Routes>    
            <Route
              path="/"
              element={<Navigate to="/models" replace />}
            />     
            <Route path="/models" element={<ModelListPage />}/>
            <Route path="/models/:modelId" element={<ModelPage />}/> 
            <Route path="/build" element={<BuildPage />}/>
            <Route path="/retrain/:modelId" element={<RetrainPage />}/>
            <Route path="/datasets/:modelId/:datasetType" element={<DatasetPage />}/>
            <Route path="/xai/test/:modelId" element={<XAITestPage />}/>
            <Route path="/xai/shap/:modelId" element={<XAIShapPage />}/>
            <Route path="/xai/lime/:modelId" element={<XAILimePage />}/>
            <Route path="/metrics/:modelId" element={<MetricsPage />}/>
            <Route path="/metrics/accountability/:modelId" element={<AccountabilityMetricsPage />}/>
            <Route path="/metrics/resilience/:modelId" element={<ResilienceMetricsPage />}/>
            <Route path="/attacks/:modelId" element={<AttacksPage />}/>
            <Route path="/predict" element={<PredictPage />}/>
            <Route path="/predict/:modelId" element={<PredictModelPage />}/>
          </Routes>
          <MAIPFooter />
        </Layout>
      </ErrorBoundary>
    </Router>
  );
}


export default App;
