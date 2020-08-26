import {branch as ogBranch, root as ogRoot} from 'baobab-react/higher-order';

let branch = ogBranch;
let root = ogRoot;
if (window.wb_branch) {
  branch = window.wb_branch;
  root = window.wb_root;
} else {
  window.wb_branch = branch;
  window.wb_root = root;
}

export {branch, root};
