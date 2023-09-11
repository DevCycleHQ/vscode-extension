import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";

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
});

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
