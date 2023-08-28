import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption());

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

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
