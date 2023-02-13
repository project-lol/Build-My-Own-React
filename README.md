# Build My Own React

> 직접 만들어보며 이해하는 리액트

<br>

## What I Learn

<br>

### createElement

- createElement는 렌더 트리르 만드는 함수이다.
- 이것은 tag의 이름, 속성, 자식을 인자로 받는다.
- 자식을 받을 때는 자식이 object일 수도 있고, string일 수도 있는데, 경우에 따라 다르게 처리한다. (object일 때는 재귀적으로 createElement를 호출하고, string일 때는 text node를 만든다.)
- 이렇게 만든 노드들을 children 배열에 넣어서 리턴한다.

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
```
