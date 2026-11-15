#!/usr/bin/env node
/**
 * Makes RCTThirdPartyComponentsProvider nil-safe and regenerates mappings
 * without NSClassFromString inside the NSDictionary literal.
 *
 * Why: App Store crash (Guideline 2.1) — unlinked Fabric classes return nil
 * from NSClassFromString and @{ ... } aborts with:
 *   attempt to insert nil object from objects[N]
 *
 * Safe to re-run; patches node_modules/react-native codegen template + generator.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rnRoot = path.join(root, 'node_modules', 'react-native');
const templatePath = path.join(
  rnRoot,
  'scripts/codegen/templates/RCTThirdPartyComponentsProviderMM.template'
);
const generatorPath = path.join(
  rnRoot,
  'scripts/codegen/generate-artifacts-executor/generateRCTThirdPartyComponents.js'
);

const NIL_SAFE_TEMPLATE = `/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


#import <Foundation/Foundation.h>

#import "RCTThirdPartyComponentsProvider.h"
#import <React/RCTComponentViewProtocol.h>

@implementation RCTThirdPartyComponentsProvider

+ (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  static NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *thirdPartyComponents = nil;
  static dispatch_once_t nativeComponentsToken;

  dispatch_once(&nativeComponentsToken, ^{
    // Skip components whose class is not linked (NSClassFromString nil) so launch
    // does not crash with: attempt to insert nil object from objects[N]
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol>> *components =
        [NSMutableDictionary new];
    NSDictionary<NSString *, NSString *> *componentClassNames = @{
{thirdPartyComponentsMapping}
    };
    [componentClassNames enumerateKeysAndObjectsUsingBlock:^(NSString *name, NSString *className, BOOL *stop) {
      Class cls = NSClassFromString(className);
      if (cls != Nil) {
        components[name] = cls;
      } else {
        NSLog(@"[RCTThirdPartyComponentsProvider] Skipping '%@' — class '%@' not linked", name, className);
      }
    }];
    thirdPartyComponents = [components copy];
  });

  return thirdPartyComponents;
}

@end
`;

if (!fs.existsSync(templatePath) || !fs.existsSync(generatorPath)) {
  console.warn('[patch-fabric-provider] react-native codegen files missing; skip');
  process.exit(0);
}

fs.writeFileSync(templatePath, NIL_SAFE_TEMPLATE);

const generator = fs.readFileSync(generatorPath, 'utf8');
const patched = generator.replace(
  /return `\\t\\t@"\$\{componentName\}": NSClassFromString\(@"\$\{className\}"\), \/\/ \$\{library\}`;/,
  'return `\\t\\t@"${componentName}": @"${className}", // ${library}`;'
);

if (patched === generator && !generator.includes('@"${className}", // ${library}')) {
  console.warn('[patch-fabric-provider] generator pattern not found; manual review needed');
  process.exit(1);
}

fs.writeFileSync(generatorPath, patched);
console.log('[patch-fabric-provider] Applied nil-safe Fabric component provider patch');
