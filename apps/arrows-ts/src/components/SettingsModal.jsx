import React, {Component} from 'react'
import {connect} from "react-redux"
import {Button, Modal, Form} from 'semantic-ui-react'
import {hideSettingsDialog} from "../actions/applicationDialogs"
import {
  retrievePrometheusUrl,
  rememberPrometheusUrl,
  retrievePrometheusGcpServiceAccountData,
  rememberPrometheusGcpServiceAccountData,
  retrieveBigQueryProjectId,
  rememberBigQueryProjectId,
  retrievePrometheusStep,
  rememberPrometheusStep
} from "../actions/localStorage"
import { setPrometheusStep } from "../actions/prometheus"

class SettingsModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      prometheusUrl: retrievePrometheusUrl(),
      prometheusGcpServiceAccountData: retrievePrometheusGcpServiceAccountData(),
      bigQueryProjectId: retrieveBigQueryProjectId(),
      prometheusStep: retrievePrometheusStep()
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.showModal && !prevProps.showModal) {
      this.setState({
        prometheusUrl: retrievePrometheusUrl(),
        prometheusGcpServiceAccountData: retrievePrometheusGcpServiceAccountData(),
        bigQueryProjectId: retrieveBigQueryProjectId(),
        prometheusStep: retrievePrometheusStep()
      })
    }
  }

  inputUpdated = (_, { name, value }) => {
    this.setState({ [name]: value })
  }

  onSave = () => {
    const { prometheusUrl, prometheusGcpServiceAccountData, bigQueryProjectId, prometheusStep } = this.state
    const stepVal = parseInt(prometheusStep, 10) || 30
    rememberPrometheusUrl(prometheusUrl)
    rememberPrometheusGcpServiceAccountData(prometheusGcpServiceAccountData)
    rememberBigQueryProjectId(bigQueryProjectId)
    rememberPrometheusStep(stepVal)
    if (this.props.onSave) {
      this.props.onSave(stepVal)
    }
    this.props.onCancel()
  }

  onCancel = () => {
    this.props.onCancel()
  }

  render() {
    const { prometheusUrl, prometheusGcpServiceAccountData, bigQueryProjectId, prometheusStep } = this.state
    return (
      <Modal
        size="small"
        open={this.props.showModal}
        onClose={this.onCancel}
      >
        <Modal.Header>Settings</Modal.Header>
        <Modal.Content scrolling>
          <Form>
            <Form.Field>
              <label>PROMETHEUS_URL</label>
              <Form.Input
                placeholder="https://prometheus.example.com"
                value={prometheusUrl}
                name="prometheusUrl"
                onChange={this.inputUpdated}
              />
            </Form.Field>
            <Form.Field>
              <label>PROMETHEUS_GCP_SERVICEACCOUNT_DATA</label>
              <Form.TextArea
                placeholder="Google Cloud Service Account JSON data"
                value={prometheusGcpServiceAccountData}
                name="prometheusGcpServiceAccountData"
                onChange={this.inputUpdated}
                rows={10}
              />
            </Form.Field>
            <Form.Field>
              <label>PROMETHEUS_STEP_INTERVAL_SEC</label>
              <Form.Input
                type="number"
                min="1"
                placeholder="30"
                value={prometheusStep}
                name="prometheusStep"
                onChange={this.inputUpdated}
              />
            </Form.Field>
            <Form.Field>
              <label>BQ_PROJECT_ID</label>
              <Form.Input
                placeholder="Google BigQuery Project ID"
                value={bigQueryProjectId}
                name="bigQueryProjectId"
                onChange={this.inputUpdated}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button
            onClick={this.onCancel}
            content="Cancel"
          />
          <Button
            onClick={this.onSave}
            positive
            content="Save"
          />
        </Modal.Actions>
      </Modal>
    )
  }
}

const mapStateToProps = state => {
  return {
    showModal: state.applicationDialogs.showSettingsDialog
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onSave: (step) => {
      dispatch(setPrometheusStep(step))
    },
    onCancel: () => {
      dispatch(hideSettingsDialog())
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsModal)
