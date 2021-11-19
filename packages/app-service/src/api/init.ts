import { ObjectId } from 'bson'
import fse = require('fs-extra')
import path = require('path')
import { Constants } from '../constants'
import { DatabaseAgent } from '../lib/database'
import { execSync } from 'child_process'

/**
 * 在 node_modules 中创建 云函数 sdk 包：@， 这个包是为了云函数IDE 加载类型提示文件而创建的，不可发布
 */
export function createCloudFunctionDeclarationPackage() {
  const source = path.resolve(__dirname, '../../dist')
  const target = path.resolve(__dirname, '../../node_modules/@')

  fse.ensureDirSync(target)
  fse.copySync(source, target)

  console.log(`copy success: ${source} => ${target}`)

  const packageJson = `
  {
    "name": "@",
    "version": "0.0.0"
  }
  `
  const pkgJsonPath = path.join(target, 'package.json')
  fse.writeFileSync(pkgJsonPath, packageJson)

  console.log(`write success: ${pkgJsonPath}`)
}

export function isCloudSdkPackageExists() {
  const target = path.resolve(__dirname, '../../../node_modules/@')
  const pkgJsonPath = path.join(target, 'package.json')
  return fse.existsSync(pkgJsonPath)
}

export function initCloudSdkPackage() {
  if (!isCloudSdkPackageExists()) {
    createCloudFunctionDeclarationPackage()
  }
}


interface AppConfigItem {
  _id: ObjectId
  key: string
  value: {
    name: string,
    version: string
  }[]
}

/**
 * Get extra npm packages
 * @returns 
 */
export async function getExtraPackages() {
  await DatabaseAgent.accessor.ready
  const db = DatabaseAgent.db
  const doc = await db.collection<AppConfigItem>(Constants.config_collection)
    .findOne({ key: 'packages' })

  return doc?.value ?? []
}

/**
 * Install packages
 * @param packages 
 * @returns 
 */
export function installPackages(packages: { name: string, version: string }[]) {
  if (!packages?.length) {
    return
  }

  const names = packages
    .map(pkg => {
      return pkg.version ? `${pkg.name}@${pkg.version}` : `${pkg.name}`
    })

  const cmd_str = names.join(' ')
  const r = execSync(`npm install ${cmd_str}`)
  return r.toString()
}

/**
 * Check if node module exists
 * @param moduleName 
 * @returns 
 */
export function moduleExists(mod: string) {
  try {
    require.resolve(mod)
    return true
  } catch (_err) {
    return false
  }
}