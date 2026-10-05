import {FlatCompat} from '@eslint/eslintrc';
const compat=new FlatCompat({baseDirectory:import.meta.dirname});
export default [
 {ignores:['.next/**','out/**','node_modules/**','qa-artifacts/**','supabase/functions/**']},
 ...compat.extends('next/core-web-vitals','next/typescript')
];
