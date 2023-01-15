import {
  updateFunctionComponent,
  updateHostComponent,
  updateClassComponent,
  updateFragmentComponent,
  updateTextComponent,
} from "./ReactFiberReconciler";
import {
  ClassComponent,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostText,
} from "./ReactWorkTags";
import { Placement, Update, updateNode } from "./utils";

let wip = null; // work in progress 当前正在工作中的
let wipRoot = null;

export function scheduleUpdateOnFiber(fiber) {
  wip = fiber;
  wipRoot = fiber;
}

// 1. 执行当前fiber任务（wip）
// 2. 更新wip

function performUnitOfWork() {
  //  todo 执行当前fiber任务（wip）
  const { tag } = wip;

  switch (tag) {
    case HostComponent:
      updateHostComponent(wip);
      break;

    case FunctionComponent:
      updateFunctionComponent(wip);
      break;

    case ClassComponent:
      updateClassComponent(wip);
      break;

    case Fragment:
      updateFragmentComponent(wip);
      break;

    case HostText:
      updateTextComponent(wip);
      break;

    default:
      break;
  }

  // 2. 更新wip 深度优先遍历
  if (wip.child) {
    wip = wip.child;
    return;
  }

  let next = wip;

  while (next) {
    if (next.sibling) {
      wip = next.sibling;
      return;
    }
    next = next.return;
  }
  wip = null;
}

function commitRoot() {
  commitWorker(wipRoot);
  wipRoot = null;
}

function commitWorker(wip) {
  if (!wip) {
    return;
  }
  // 1. 自己
  const { stateNode, flags } = wip;
  // 父dom节点
  const parentNode = getParentNode(wip.return); //wip.return.stateNode;

  if (flags & Placement && stateNode) {
    parentNode.appendChild(stateNode);
  }

  if (flags & Update && stateNode) {
    updateNode(stateNode, wip.alternate.props, wip.props);
  }
  if (wip.deletions) {
    commitDeletions(wip.deletions, stateNode || parentNode);
  }

  // 2. 下一个孩子
  commitWorker(wip.child);
  // 3. 下一个兄弟
  commitWorker(wip.sibling);
}

function commitDeletions(deletions, parentNode) {
  for (let i = 0; i < deletions.length; i++) {
    parentNode.removeChild(getStateNode(deletions[i]));
  }
}

function getStateNode(fiber) {
  let tem = fiber;
  while (!tem.stateNode) {
    tem = tem.child;
  }

  return tem.stateNode;
}

function workLoop(IdleDeadLine) {
  while (wip && IdleDeadLine.timeRemaining() > 0) {
    performUnitOfWork();
  }

  requestIdleCallback(workLoop);

  if (!wip && wipRoot) {
    commitRoot();
  }
}

// react scheduler 部分原生实现了一套：浏览器空闲时间段内调用函数排队
requestIdleCallback(workLoop);

function getParentNode(wip) {
  // 自定义组件没有实体，return里全是child，需往上找父组件
  let tem = wip;
  while (tem) {
    if (tem.stateNode) {
      return tem.stateNode;
    }
    tem = tem.return;
  }
}
