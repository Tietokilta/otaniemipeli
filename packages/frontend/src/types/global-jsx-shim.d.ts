import type { JSX as ReactJSX } from "react";

declare global {
  namespace JSX {
    export import Element = ReactJSX.Element;
    export import ElementClass = ReactJSX.ElementClass;
    export import ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    export import ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
    export import IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
    export import IntrinsicClassAttributes = ReactJSX.IntrinsicClassAttributes;
    export import IntrinsicElements = ReactJSX.IntrinsicElements;
    export import LibraryManagedAttributes = ReactJSX.LibraryManagedAttributes;
  }
}
