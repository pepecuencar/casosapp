import React, { Component } from 'react';
import {BrowserRouter as Router, Route, NavLink} from 'react-router-dom';
import { Divider, Form, Grid,Header, List, Input, Segment, Table } from 'semantic-ui-react';
import './App.css';
import {v4 as uuid} from 'uuid';
import Amplify, { API, Auth, Storage } from 'aws-amplify';
import { S3Image, withAuthenticator } from 'aws-amplify-react';

import aws_exports from './aws-exports';

Amplify.configure(aws_exports);

function makeComparator(key, order='asc') {
  return (a, b) => {
    if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) return 0; 

    const aVal = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
    const bVal = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (aVal > bVal) comparison = 1;
    if (aVal < bVal) comparison = -1;

    return order === 'desc' ? (comparison * -1) : comparison
  };
}

class NewCase extends Component {
  constructor(props) {
    super(props);
    this.state = {caseName: ''};
    }

  handleChange = (event) => {
    let change = {};
    change[event.target.name] = event.target.value;
    this.setState(change);
  }

  handleSubmit = async (event) => {
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser();
    const caseName = this.state.caseName;
    let data = {
      headers: {
        'Content-Type': 'application/json'
      }, body: {
        owner: user.username,
        name: caseName
      }
    }
    const result = await API.post("casosapi", "/cases", data);
    console.info('Created case with id: ' + result);
    this.setState({caseName:''}); 
  }

  render() {
    return (
      <Segment>
        <Header as='h3'>Crear un caso</Header>
          <Input
          type='text'
          placeholder='Nombre del Caso'
          icon='plus'
          iconPosition='left'
          action={{ content: 'Crear', onClick: this.handleSubmit }}
          name='caseName'
          value={this.state.caseName}
          onChange={this.handleChange}
          />
        </Segment>
      )
    }
}

class CasesListLoader extends React.Component{
  constructor(props) {
    super(props);
    this.state = { caso: [] }
  }
  async componentDidMount() {
    await this.fetchList();
  }
  async fetchList() {
    const response = await API.get("casosapi", "/cases");
    this.setState({ caso: [...response] });
  }

  render() {
        return (<CasesList caso={this.state.caso}/> );
        }
}

class CasesList extends React.Component { 
  caseItems() {
    return this.props.caso.sort(makeComparator('name')).map(caso =>
      <List.Item key={caso.id}>
        <NavLink to={`/cases/${caso.id}`}>{caso.name}</NavLink>
      </List.Item>
    );
  }

  render() {
    return (
      <Segment>
        <Header as='h3'>Mis Casos</Header>
        <List divided relaxed>
          {this.caseItems()}
        </List>
      </Segment>
    );
  }
}

/*class CasesList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {caso: []};
  }
  async componentDidMount() {
    await this.fetchList();
    console.log("Casos " + this.state.caso.id);
  }

  async fetchList() {
    const response = await API.get("casosapi", "/cases");
    this.setState({ caso: [...response] });
    console.log(this.state);
  }
  
  caseItems() {
    return this.props.caso.sort(makeComparator('name')).map(caso =>
     <Table.Row key={caso.id}>
        <Table.Cell > <a href={'/cases/' + caso.id}> {caso.name} </a>
        </Table.Cell>
        <Table.Cell>{caso.status}</Table.Cell>
      </Table.Row>
    );
  }

  render() {
    return (
      <Segment>
        <Header as='h3'>Mis Casos</Header>
       <Table celled>
        <Table.Header>
            <Table.Row><Table.HeaderCell>Casos</Table.HeaderCell><Table.HeaderCell>Estatus</Table.HeaderCell>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {this.caseItems()}
        </Table.Body>
        </Table>
      </Segment>
    );
  }
}*/

class S3ImageUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = { uploading: false }
  }
  uploadFile = async (file) => {
    const fileName = uuid();
    const user = await Auth.currentAuthenticatedUser();

    const result = await Storage.put(
      fileName, 
      file, 
      {
        customPrefix: { public: 'uploads/' },
        metadata: { caseid: this.props.caseId, owner: user.username }
      }
    );

    console.log('Uploaded file: ', result);
  }

  onChange = async (e) => {
    this.setState({uploading: true});
    
    let files = [];
    for (var i=0; i<e.target.files.length; i++) {
      files.push(e.target.files.item(i));
    }
    await Promise.all(files.map(f => this.uploadFile(f)));

    this.setState({uploading: false});
  }

  render() {
    return (
      <div>
        <Form.Button
          onClick={() => document.getElementById('add-image-file-input').click()}
          disabled={this.state.uploading}
          icon='file image outline'
          content={ this.state.uploading ? 'Uploading...' : 'Agregar Imagen' }
        />
        <input
          id='add-image-file-input'
          type="file"
          accept='image/*'
          multiple
          onChange={this.onChange}
          style={{ display: 'none' }}
        />
        </div>
    );
  }
}

class PhotosList extends React.Component {
  photoItems() {
    return this.props.photos.map(photo =>
      <S3Image 
        key={photo.thumbnail.key} 
        imgKey={photo.thumbnail.key.replace('public/', '')} 
        style={{display: 'inline-block', 'paddingRight': '5px'}}
      />
    );
  }

  render() {
    return (
      <div>
        <Divider hidden />
        {this.photoItems()}
      </div>
    );
  }
}

class CaseDetailsLoader extends React.Component {
  constructor(props) {
    super(props);
    this.state = { caso: [] }
  }
  async componentDidMount() {
    await this.fetchList();
  }
  async fetchList() {
    const response = await API.get("casosapi", "/cases/" + this.props.id);
    this.setState({ caso: [...response] });
  }

  render() {
        return (<CaseDetails caso={this.state.caso}/> );
        }
}

class CaseDetails extends Component {
  render() {
      if (!this.props.caso) return 'Loading Case...';
      return (
          <Segment>
            <Header as='h3'>{this.props.caso.id}</Header>
            <Header as='h3'>{this.props.caso.photoCaseId}</Header>
            <S3ImageUpload caseId={this.props.caso.id}/>        
          </Segment>
      )
  }
}

class App extends Component {
  render(){
    return (
      <Router>
        <Grid padded>
          <Grid.Column>
            <Route path="/" exact component={NewCase}/>
            <Route path="/" exact component={CasesListLoader} /> 
            <Route path="/cases/:caseId" render={ () => <div><NavLink to='/'>Regresar a Mis casos </NavLink></div> }/>
            <Route
              path="/cases/:caseId" render={props=> <CaseDetailsLoader id={props.match.params.caseId}/> }
            />
          </Grid.Column>
        </Grid>
      </Router>
    );
  }
}  
export default withAuthenticator(App, {includeGreetings: true});

