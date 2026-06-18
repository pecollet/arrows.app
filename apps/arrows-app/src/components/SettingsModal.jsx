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
  rememberBigQueryProjectId
} from "../actions/localStorage"

class SettingsModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      prometheusUrl: retrievePrometheusUrl(),
      prometheusGcpServiceAccountData: retrievePrometheusGcpServiceAccountData(),
      bigQueryProjectId: retrieveBigQueryProjectId()
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.showModal && !prevProps.showModal) {
      this.setState({
        prometheusUrl: retrievePrometheusUrl(),
        prometheusGcpServiceAccountData: retrievePrometheusGcpServiceAccountData(),
        bigQueryProjectId: retrieveBigQueryProjectId()
      })
    }
  }

  inputUpdated = (_, { name, value }) => {
    this.setState({ [name]: value })
  }

  onSave = () => {
    const { prometheusUrl, prometheusGcpServiceAccountData, bigQueryProjectId } = this.state
    rememberPrometheusUrl(prometheusUrl)
    rememberPrometheusGcpServiceAccountData(prometheusGcpServiceAccountData)
    rememberBigQueryProjectId(bigQueryProjectId)
    this.props.onCancel()
  }

  onCancel = () => {
    this.props.onCancel()
  }

  render() {
    const { prometheusUrl, prometheusGcpServiceAccountData, bigQueryProjectId } = this.state
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
    onCancel: () => {
      dispatch(hideSettingsDialog())
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsModal)
