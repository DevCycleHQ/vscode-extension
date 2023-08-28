import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption());

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // Inspector dropdowns
  const inspectorDropdownType = document.getElementsByClassName("inspector-dropdown-type") as HTMLCollectionOf<Dropdown>
  const inspectorDropdownValue = document.getElementsByClassName("inspector-dropdown-value") as HTMLCollectionOf<Dropdown>  
  for (let i = 0; i < inspectorDropdownType.length; i++) {
    const dropdown = inspectorDropdownType[i];
    dropdown.addEventListener('change', handleDropdownValueChange);
  }
  for (let i = 0; i < inspectorDropdownValue.length; i++) {
    const dropdown = inspectorDropdownValue[i];
    dropdown.addEventListener('change', handleDropdownValueChange);
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
