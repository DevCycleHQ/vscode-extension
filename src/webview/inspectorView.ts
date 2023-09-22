import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";
import Fuse from "fuse.js";
import { Feature, Variable } from "../cli";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption());

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

const focusedElement = document.querySelector('.focus')

if (focusedElement) {
  focusedElement.scrollIntoView()

  window.addEventListener('click', () => {
    focusedElement.classList.remove('focus')
  }, { once: true })
}


window.addEventListener('message', (event) => {
  const message = event.data
  vscode.postMessage(message)

  if (message.type === 'variables' || message.type === 'features') {
    const data = JSON.parse(message.value)
    localStorage.setItem(message.type, JSON.stringify(data))
  }

})

function main() {
  const addDropdownValueChangeListenersToDropdowns = (dropdowns: string[]) => {
    for (const dropdown of dropdowns) {
      const dropdownElements = document.getElementsByClassName(dropdown) as HTMLCollectionOf<Dropdown>
      for (let i = 0; i < dropdownElements.length; i++) {
        const dropdownElement = dropdownElements[i];
        dropdownElement.addEventListener('change', handleDropdownValueChange)
      }
    }
  }
  // Inspector dropdowns
  addDropdownValueChangeListenersToDropdowns([
    'inspector-dropdown-folder',
    'inspector-dropdown-type',
    'inspector-dropdown-value'
  ])


  const featureLink = document.getElementById('feature-link') as HTMLDivElement
  if (featureLink) {
    featureLink.addEventListener('click', (event) => {
      handleLink(event, 'Feature')
    })
  }

  const variableLinks = document.getElementsByClassName('variable-link') as HTMLCollectionOf<HTMLDivElement>
  for (let i = 0; i < variableLinks.length; i++) {
    const variableLink = variableLinks[i];
    variableLink.addEventListener('click', (event) => {
      handleLink(event, 'Variable')
    })
  }

  const jsonTypeVariables = document.querySelectorAll('.clickable-object')
  if (jsonTypeVariables) {
    jsonTypeVariables.forEach((jsonTypeVariable) => {
      jsonTypeVariable.addEventListener('click', () => {
        vscode.postMessage({ type: 'jsonReadonly', value: jsonTypeVariable.textContent })
      })
    })
  }

  handleCustomDropdown()
}

function handleDropdownValueChange(event: Event) {
  if (!event.target) {
    return;
  }

  const dropdownElement = event.target as HTMLSelectElement;

  vscode.postMessage({
    type: dropdownElement.dataset.type,
    value: dropdownElement.value,
    folderIndex: dropdownElement.dataset.folder
  });
}

function handleLink(event: Event, type: 'Variable' | 'Feature') {
  if (!event.currentTarget) {
    return;
  }
  const element = event.currentTarget as HTMLDivElement
  vscode.postMessage({ type: 'key', value: element.dataset.value, selectedType: type })
}

function handleCustomDropdown() {
  const input = document.querySelector('.dropdown-input') as HTMLInputElement
  const optionsList = document.querySelector('.dropdown-options') as HTMLDivElement
  const keyType = document.querySelector('#typeId') as HTMLSelectElement
  const keyTypeValue = keyType?.value

  let localStorageData

  if (keyTypeValue === 'Feature') {
    localStorageData = localStorage.getItem('features')
  }
  if (keyTypeValue === 'Variable') {
    localStorageData = localStorage.getItem('variables')
  }

  if (!localStorageData) {
    return
  }

  let fuse: Fuse<Variable | Feature>
  const searchData: Variable[] | Feature[] = JSON.parse(localStorageData)
  const fuseOptions = {
    keys: ['key', 'name'],
    threshold: 0.5,
  }

  fuse = new Fuse([...searchData], fuseOptions)
  
  const createAndAppendOption = (item: Feature | Variable) =>{
    const option = document.createElement('div')
    option.textContent = keyTypeValue === 'Feature' ? item.name : item.key
    option.setAttribute('data-value', keyTypeValue === 'Feature' ? item._id : item.key)
    optionsList.appendChild(option);
  }

  // Event listeners to handle dropdown behavior
  document.addEventListener('click', () => {
    optionsList?.classList.remove('visible')
  })

  input?.addEventListener('click', (event) => {
    event.stopPropagation()
    optionsList?.classList.toggle('visible')
  })

  input?.addEventListener('input', () => {
    if (!fuse) {
      return
    }

    const inputValue = input?.value.toLowerCase().trim()
    optionsList.innerHTML = ''

    if (inputValue === '') {
      searchData.forEach((item) => {
        createAndAppendOption(item)
      })

      optionsList.classList.add('visible')
    } else {
      const results = fuse?.search(inputValue)

      results.forEach((result) => {
        createAndAppendOption(result.item)
      })

      if (results.length > 0) {
        optionsList.classList.add('visible')
      } else {
        optionsList.classList.remove('visible')
      }
    }
  })

  optionsList.addEventListener('click', (event) => {
    const selectedOption = event.target as HTMLElement
    if (selectedOption.tagName === 'DIV') {
      const selectedValue = selectedOption.getAttribute('data-value')
      if (selectedValue) {
        vscode.postMessage({
          type: 'key',
          value: selectedValue,
        })
        optionsList.classList.remove('visible')
      }
    }
  })
}