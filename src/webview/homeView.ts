import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, Dropdown } from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption());

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // Home section nav shadow on scroll
  const homeNavIntercept = document.getElementById("home-nav-intercept") as HTMLElement;
  const header = document.getElementById("home-nav") as HTMLElement;
  homeNavIntercept.setAttribute("data-observer-intercept", "");
  header.before(homeNavIntercept);

  const observer = new IntersectionObserver(([entry]) => {
    header.classList.toggle("active", !entry.isIntersecting);
  });

  observer.observe(homeNavIntercept);

  // Logout button
  const logoutButton = document.getElementById("logout-button") as HTMLButtonElement;
  logoutButton.addEventListener('click', () => {
    vscode.postMessage({
      type: 'logout'
    });
  });

  // Home section dropdowns
  const homeSectionDropdowns = document.getElementsByClassName("home-dropdown") as HTMLCollectionOf<Dropdown>;
  for (let i = 0; i < homeSectionDropdowns.length; i++) {
    const dropdown = homeSectionDropdowns[i];
    dropdown.addEventListener('change', handleDropdownValueChange);
  }

  // Edit config button
  const editConfigButton = document.getElementById("edit-config-button") as HTMLAnchorElement;
  editConfigButton.addEventListener('click', handleEditConfigClick);
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

const handleEditConfigClick = (event: Event) => {
  const anchorElement = event.target as HTMLAnchorElement;
  vscode.postMessage({
    type: 'config',
    folderIndex: anchorElement.dataset.folder
  });
}
